"use client";

import ReactMarkdown from 'react-markdown';

interface MarkdownTextProps {
  content: string;
}

export default function MarkdownText({ content }: MarkdownTextProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        components={{
          // Style links
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="text-blue-600 hover:text-blue-800 underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          // Preserve line breaks
          p: ({ node, ...props }) => (
            <p {...props} className="mb-2 last:mb-0" />
          ),
          // Style strong text
          strong: ({ node, ...props }) => (
            <strong {...props} className="font-semibold text-ntu-green" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

