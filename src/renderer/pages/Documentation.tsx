import React, { useMemo, useState } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { MarkdownViewer } from '../components/MarkdownViewer';
import {
  docCategories,
  defaultPage,
  findPage,
  type DocCategory,
  type DocPage,
} from '../docs/structure';

interface Selection {
  categorySlug: string;
  pageSlug: string;
}

export function Documentation() {
  const [selection, setSelection] = useState<Selection>(defaultPage);
  const [query, setQuery] = useState('');

  const current = useMemo(() => findPage(selection.categorySlug, selection.pageSlug), [selection]);

  const filteredCategories = useMemo<DocCategory[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docCategories;
    return docCategories
      .map((cat) => ({
        ...cat,
        pages: cat.pages.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.summary?.toLowerCase().includes(q) ?? false) ||
            p.content.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.pages.length > 0);
  }, [query]);

  const handleSelect = (categorySlug: string, page: DocPage) => {
    setSelection({ categorySlug, pageSlug: page.slug });
  };

  return (
    <div className="flex h-full min-h-0 gap-6">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-primary-200 pr-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary-700" />
          <h1 className="text-xl font-semibold font-serif text-primary-800">Documentation</h1>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs…"
          className="w-full mb-4 px-3 py-2 text-sm border border-primary-200 rounded-md bg-white text-primary-800 placeholder:text-primary-500 focus:outline-none focus:border-primary-400"
        />

        <nav className="space-y-5">
          {filteredCategories.length === 0 && (
            <p className="text-sm text-primary-600">No pages match your search.</p>
          )}
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.slug}>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-primary-600">
                  <Icon className="w-4 h-4" />
                  <span>{category.title}</span>
                </div>
                <ul className="space-y-0.5">
                  {category.pages.map((page) => {
                    const isActive =
                      category.slug === selection.categorySlug &&
                      page.slug === selection.pageSlug;
                    return (
                      <li key={page.slug}>
                        <button
                          onClick={() => handleSelect(category.slug, page)}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                            isActive
                              ? 'bg-primary-100 text-primary-900 font-medium'
                              : 'text-primary-700 hover:bg-primary-50'
                          }`}
                        >
                          {page.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="mt-8 pt-4 border-t border-primary-200">
          <button
            onClick={() =>
              window.electronAPI?.openExternal?.(
                'https://github.com/michael-borck/insight-lens/issues',
              )
            }
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Report an issue on GitHub
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 min-h-0">
        {current ? (
          <MarkdownViewer content={current.page.content} title={current.page.title} />
        ) : (
          <div className="h-full flex items-center justify-center text-primary-600">
            Select a page from the sidebar.
          </div>
        )}
      </div>
    </div>
  );
}
