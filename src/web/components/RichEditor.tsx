import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from "@/components/ui/button";
import { Bold, Italic, Strikethrough, AlignLeft, AlignCenter, AlignRight, Code, Quote, Download } from 'lucide-react';

interface RichEditorProps {
  content: string;
  onEditorReady: (editor: any) => void;
  onSave?: (html: string) => void;
}

export default function RichEditor({ content, onEditorReady, onSave }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {},
        orderedList: {},
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      if (onSave) onSave(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  if (!editor) return null;

  return (
    <div className="flex flex-col space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap justify-start gap-2 p-2 border-b border-gray-300">
        <Button variant="outline" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></Button>
        <Button variant="outline" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></Button>
        <Button variant="outline" onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></Button>
        <Button variant="outline" onClick={() => {/* Font logic */}}><span>Font</span></Button>
        <Button variant="outline" onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={16} /></Button>
        <Button variant="outline" onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={16} /></Button>
        <Button variant="outline" onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={16} /></Button>
        <Button variant="outline" onClick={() => {/* Superscript logic */}}><span>ε</span></Button>
        <Button variant="outline" onClick={() => {/* Subscript logic */}}><span>∑</span></Button>
        <Button variant="outline" onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={16} /></Button>
        <Button variant="outline" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></Button>
        <Button variant="outline" onClick={() => editor.chain().focus().unsetAllMarks().run()}><span>-</span></Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {/* Download logic */}}><Download size={16} /></Button>
        <Button variant="outline" onClick={() => {/* Close logic */}}><span>Close</span></Button>
      </div>

      {/* Editor Box */}
      <div className="rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 transition-all duration-200 shadow-sm bg-white">
        <EditorContent
          editor={editor}
          className="min-h-[300px] w-full resize-none p-6 font-sans text-gray-800 focus:outline-none"
          spellCheck={true}
        />
      </div>
    </div>
  );
}