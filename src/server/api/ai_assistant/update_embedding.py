import os
import re
import uuid
import fitz  # PyMuPDF
import pandas as pd
from playwright.sync_api import sync_playwright

class SectionProcessor:
    def __init__(self, db, collection_name, embedder, logger=None):
        self.db = db
        self.collection = db[collection_name]
        self.embedder = embedder
        self.logger = logger

    def extract_keywords(self, text, top_n=5):
        self.logger.debug("Extracting keywords from text")
        words = re.findall(r'\b\w+\b', text.lower())
        stopwords = set(["the", "and", "is", "to", "of", "a", "in", "for", "on", "with", "as", "by", "an", "or"])
        freq = {}
        for word in words:
            if word not in stopwords and len(word) > 2:
                freq[word] = freq.get(word, 0) + 1
        keywords = sorted(freq, key=freq.get, reverse=True)[:top_n]
        self.logger.debug(f"Extracted keywords: {keywords}")
        return keywords

    def scrape_html_sections(self, url):
        self.logger.info(f"Scraping HTML from: {url}")
        sections = []
        current_h2 = ""
        current_h3 = ""
        current_content = ""

        def flush():
            nonlocal current_content
            if current_content.strip():
                title = f"{current_h2} > {current_h3}".strip(" >")
                sections.append({"title": title, "content": current_content.strip()})
                self.logger.debug(f"Flushed section: {title}")
                current_content = ""

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(url, timeout=60000)
                page.wait_for_selector("main")

                elements = page.locator("main").locator("h1, h2, h3, h4, p, ul, ol").all()
                for el in elements:
                    tag = el.evaluate("el => el.tagName.toLowerCase()")
                    text = el.inner_text().strip()
                    if tag in ["h1", "h2"]:
                        flush()
                        current_h2, current_h3 = text, ""
                    elif tag == "h3":
                        flush()
                        current_h3 = text
                    else:
                        current_content += text + " "

                flush()
                browser.close()
        except Exception as e:
            self.logger.error(f"Failed to scrape HTML from {url}: {e}", exc_info=True)
            raise

        self.logger.info(f"Scraped {len(sections)} sections from {url}")
        return sections

    def extract_pdf_sections_by_toc(self, pdf_path):
        self.logger.info(f"Extracting PDF: {pdf_path}")
        sections = []

        try:
            doc = fitz.open(pdf_path)
            toc = doc.get_toc()
            if not toc:
                raise ValueError("No Table of Contents found in PDF.")

            for i, (level, title, page) in enumerate(toc):
                start_page = page - 1
                end_page = toc[i + 1][2] - 1 if i + 1 < len(toc) else len(doc)
                text = ""
                for p in range(start_page, end_page):
                    text += doc.load_page(p).get_text()
                path = [t[1] for t in toc[:i+1] if t[0] <= level]
                full_title = " > ".join(path)
                sections.append({"title": full_title.strip(), "content": text.strip()})
                self.logger.debug(f"Extracted section: {full_title.strip()}")
        except Exception as e:
            self.logger.error(f"Error extracting from PDF {pdf_path}: {e}", exc_info=True)
            raise

        self.logger.info(f"Extracted {len(sections)} sections from PDF {pdf_path}")
        return sections

    def index_sections(self, area, topic, source_type, source, sections):
        self.logger.info(f"Indexing {len(sections)} sections for topic '{topic}'")
        for sec in sections:
            try:
                full_text = f"{sec['title']}\n{sec['content']}"
                embedding = self.embedder.get_embedding(full_text)
                keywords = self.extract_keywords(sec["content"])
                doc = {
                    "_id": str(uuid.uuid4()),
                    "area": area,
                    "topic": topic,
                    "source_type": source_type,
                    "source": source,
                    "title": sec["title"],
                    "content": sec["content"],
                    "keywords": keywords,
                    "embedding": embedding
                }
                self.collection.insert_one(doc)
                self.logger.info(f"Inserted section: {sec['title']}")
            except Exception as e:
                self.logger.warning(f"Failed to insert section '{sec.get('title', 'Unknown')}': {e}", exc_info=True)

    def process_csv_and_pdfs(self, csv_path, pdf_paths):
        if csv_path:
            self.logger.info(f"Processing CSV file: {csv_path}")
            try:
                df = pd.read_csv(csv_path)
                prev_area = ""
                for _, row in df.iterrows():
                    area = row["Area"] if pd.notna(row["Area"]) else prev_area
                    topic = row["Topic"]
                    url = row["Link"]
                    prev_area = area

                    try:
                        self.logger.info(f"Scraping: {topic} ({url})")
                        sections = self.scrape_html_sections(url)
                        self.index_sections(area, topic, "web", url, sections)
                    except Exception as e:
                        self.logger.error(f"Failed to scrape {url} for topic '{topic}': {e}", exc_info=True)
            except Exception as e:
                self.logger.error(f"Failed to load or parse CSV: {csv_path}: {e}", exc_info=True)

        for pdf_path in pdf_paths:
            topic = os.path.splitext(os.path.basename(pdf_path))[0]
            self.logger.info(f"Processing PDF file: {pdf_path}")
            try:
                sections = self.extract_pdf_sections_by_toc(pdf_path)
                self.index_sections("PDF Documents", topic, "pdf", pdf_path, sections)
            except Exception as e:
                self.logger.error(f"Failed to process PDF {pdf_path}: {e}", exc_info=True)
