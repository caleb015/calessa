'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/adminApi';
import ImagePreview from '@/components/dashboard/ImagePreview';

type FieldType = 'text' | 'textarea' | 'datetime' | 'number' | 'checkbox' | 'email' | 'image';

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
}

type Item = Record<string, unknown> & { id: string };

interface SectionConfig {
  key: string;
  label: string;
  singular: string;
  apiGet: () => Promise<unknown>;
  apiCreate: (body: unknown) => Promise<unknown>;
  apiUpdate: (id: string, body: unknown) => Promise<unknown>;
  apiDelete: (id: string) => Promise<unknown>;
  fields: FieldConfig[];
  itemLabel: (item: Item) => string;
  itemSublabel?: (item: Item) => string;
  hasPublished: boolean;
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'events',
    label: 'Events',
    singular: 'Event',
    apiGet: () => adminApi.getEvents(),
    apiCreate: (b) => adminApi.createEvent(b),
    apiUpdate: (id, b) => adminApi.updateEvent(id, b),
    apiDelete: (id) => adminApi.deleteEvent(id),
    hasPublished: false,
    itemLabel: (item) => item.title as string,
    itemSublabel: (item) => [item.type, item.venueName].filter(Boolean).join(' · ') as string,
    fields: [
      { key: 'type', label: 'Type', type: 'text', required: true, placeholder: 'ceremony, reception…' },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'venueName', label: 'Venue', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'startTime', label: 'Start Time', type: 'datetime' },
      { key: 'endTime', label: 'End Time', type: 'datetime' },
      { key: 'mapUrl', label: 'Map URL', type: 'text', placeholder: 'https://maps.google.com/…' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
    ],
  },
  {
    key: 'schedule',
    label: 'Schedule',
    singular: 'Schedule item',
    apiGet: () => adminApi.getSchedule(),
    apiCreate: (b) => adminApi.createScheduleItem(b),
    apiUpdate: (id, b) => adminApi.updateScheduleItem(id, b),
    apiDelete: (id) => adminApi.deleteScheduleItem(id),
    hasPublished: true,
    itemLabel: (item) => item.title as string,
    itemSublabel: (item) => item.timeLabel as string,
    fields: [
      { key: 'timeLabel', label: 'Time', type: 'text', required: true, placeholder: '3:00 PM' },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
      { key: 'isPublished', label: 'Published', type: 'checkbox' },
    ],
  },
  {
    key: 'faqs',
    label: 'FAQs',
    singular: 'FAQ',
    apiGet: () => adminApi.getFaqs(),
    apiCreate: (b) => adminApi.createFaq(b),
    apiUpdate: (id, b) => adminApi.updateFaq(id, b),
    apiDelete: (id) => adminApi.deleteFaq(id),
    hasPublished: true,
    itemLabel: (item) => item.question as string,
    itemSublabel: (item) => item.category as string || '',
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
      { key: 'isPublished', label: 'Published', type: 'checkbox' },
    ],
  },
  {
    key: 'gallery',
    label: 'Gallery',
    singular: 'Image',
    apiGet: () => adminApi.getGallery(),
    apiCreate: (b) => adminApi.createGalleryImage(b),
    apiUpdate: (id, b) => adminApi.updateGalleryImage(id, b),
    apiDelete: (id) => adminApi.deleteGalleryImage(id),
    hasPublished: true,
    itemLabel: (item) => (item.title || item.imageUrl) as string,
    itemSublabel: (item) => (item.title ? item.imageUrl as string : '') || '',
    fields: [
      { key: 'imageUrl', label: 'Image URL', type: 'image', required: true, placeholder: '/images/photo.jpg or https://…' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
      { key: 'isPublished', label: 'Published', type: 'checkbox' },
    ],
  },
  {
    key: 'story',
    label: 'Story',
    singular: 'Story item',
    apiGet: () => adminApi.getStoryTimeline(),
    apiCreate: (b) => adminApi.createStoryItem(b),
    apiUpdate: (id, b) => adminApi.updateStoryItem(id, b),
    apiDelete: (id) => adminApi.deleteStoryItem(id),
    hasPublished: true,
    itemLabel: (item) => item.title as string,
    itemSublabel: (item) => item.dateLabel as string || '',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'dateLabel', label: 'Date Label', type: 'text', placeholder: 'June 2019' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'imageUrl', label: 'Image URL', type: 'image', placeholder: '/images/story.jpg or https://…' },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
      { key: 'isPublished', label: 'Published', type: 'checkbox' },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    singular: 'Contact person',
    apiGet: () => adminApi.getContacts(),
    apiCreate: (b) => adminApi.createContact(b),
    apiUpdate: (id, b) => adminApi.updateContact(id, b),
    apiDelete: (id) => adminApi.deleteContact(id),
    hasPublished: true,
    itemLabel: (item) => item.name as string,
    itemSublabel: (item) => item.role as string || '',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text', placeholder: 'e.g. Wedding Planner' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
      { key: 'isPublished', label: 'Published', type: 'checkbox' },
    ],
  },
];

function stripMeta(item: Record<string, unknown>) {
  const { id, createdAt, updatedAt, ...rest } = item;
  return rest;
}

const inputCls = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

function FormField({
  field,
  form,
  onChange,
}: {
  field: FieldConfig;
  form: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const value = form[field.key];

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          className="cursor-pointer"
          checked={!!(value)}
          onChange={e => onChange(field.key, e.target.checked)}
        />
        <span className="text-sm text-gray-700">{field.label}</span>
      </label>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        className={`${inputCls} resize-none`}
        rows={3}
        placeholder={field.placeholder}
        value={(value as string) ?? ''}
        onChange={e => onChange(field.key, e.target.value)}
      />
    );
  }

  if (field.type === 'datetime') {
    const dateVal = value ? new Date(value as string).toISOString().slice(0, 16) : '';
    return (
      <input
        type="datetime-local"
        className={inputCls}
        value={dateVal}
        onChange={e => onChange(field.key, e.target.value ? new Date(e.target.value).toISOString() : null)}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        className={inputCls}
        min={0}
        value={(value as number) ?? 0}
        onChange={e => onChange(field.key, e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
      />
    );
  }

  if (field.type === 'image') {
    return (
      <div>
        <input
          type="text"
          className={inputCls}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={e => onChange(field.key, e.target.value)}
        />
        <ImagePreview src={(value as string) ?? ''} />
      </div>
    );
  }

  return (
    <input
      type={field.type}
      className={inputCls}
      placeholder={field.placeholder}
      value={(value as string) ?? ''}
      onChange={e => onChange(field.key, e.target.value)}
    />
  );
}

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState(SECTIONS[0].key);
  const [allItems, setAllItems] = useState<Record<string, Item[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setFormState] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // FAQ accordion — independent per-item state
  const [openFaqIds, setOpenFaqIds] = useState<Set<string>>(new Set());
  const [faqForms, setFaqForms] = useState<Record<string, Record<string, unknown>>>({});
  const [savingFaqId, setSavingFaqId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(SECTIONS.map(s => s.apiGet()));
      const map: Record<string, Item[]> = {};
      SECTIONS.forEach((s, i) => { map[s.key] = results[i] as Item[]; });
      setAllItems(map);
    } catch {
      setError('Failed to load content.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const section = SECTIONS.find(s => s.key === activeTab)!;
  const items = allItems[activeTab] ?? [];

  const switchTab = (key: string) => {
    setActiveTab(key);
    setEditingId(null);
    setFormState({});
    setError(null);
    setConfirmDelete(null);
    setOpenFaqIds(new Set());
    setFaqForms({});
  };

  const startNew = () => {
    const defaults: Record<string, unknown> = section.hasPublished ? { isPublished: true } : {};
    setEditingId('new');
    setFormState(defaults);
    setError(null);
    setConfirmDelete(null);
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setFormState({ ...item });
    setError(null);
    setConfirmDelete(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormState({});
    setError(null);
  };

  const setField = (key: string, value: unknown) =>
    setFormState(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId === 'new') {
        const created = await section.apiCreate(stripMeta(form)) as Item;
        setAllItems(prev => ({ ...prev, [activeTab]: [...(prev[activeTab] ?? []), created] }));
      } else {
        const updated = await section.apiUpdate(editingId!, stripMeta(form)) as Item;
        setAllItems(prev => ({
          ...prev,
          [activeTab]: prev[activeTab].map(it => it.id === editingId ? updated : it),
        }));
      }
      setEditingId(null);
      setFormState({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await section.apiDelete(id);
      setAllItems(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].filter(it => it.id !== id),
      }));
      if (editingId === id) cancelEdit();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete.');
    } finally {
      setConfirmDelete(null);
    }
  };

  const toggleFaq = (item: Item) => {
    if (openFaqIds.has(item.id)) {
      setOpenFaqIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
      setFaqForms(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    } else {
      setOpenFaqIds(prev => new Set([...prev, item.id]));
      setFaqForms(prev => ({ ...prev, [item.id]: { ...item } }));
    }
  };

  const setFaqField = (id: string, key: string, value: unknown) =>
    setFaqForms(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const saveFaq = async (id: string) => {
    setSavingFaqId(id);
    setError(null);
    try {
      const updated = await section.apiUpdate(id, stripMeta(faqForms[id])) as Item;
      setAllItems(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(it => it.id === id ? updated : it),
      }));
      setFaqForms(prev => ({ ...prev, [id]: { ...updated } }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingFaqId(null);
    }
  };

  const gridFields = section.fields.filter(f => f.type !== 'textarea' && f.type !== 'checkbox');
  const textareaFields = section.fields.filter(f => f.type === 'textarea');
  const checkboxFields = section.fields.filter(f => f.type === 'checkbox');

  const editForm = (
    <div className="bg-white border-2 border-gray-900 rounded-lg p-5 space-y-4">
      {gridFields.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {gridFields.map(field => (
            <div key={field.key}>
              <label className={labelCls}>
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <FormField field={field} form={form} onChange={setField} />
            </div>
          ))}
        </div>
      )}
      {textareaFields.map(field => (
        <div key={field.key}>
          <label className={labelCls}>
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <FormField field={field} form={form} onChange={setField} />
        </div>
      ))}
      {checkboxFields.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {checkboxFields.map(field => (
            <FormField key={field.key} field={field} form={form} onChange={setField} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : editingId === 'new' ? `Add ${section.singular.toLowerCase()}` : 'Save changes'}
        </button>
        <button
          onClick={cancelEdit}
          className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Content</h1>

      <div className="flex border-b border-gray-200 mb-6">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => switchTab(s.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === s.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
            {editingId !== 'new' && (
              <button
                onClick={startNew}
                className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
              >
                + Add {section.singular.toLowerCase()}
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {editingId === 'new' && <div className="mb-3">{editForm}</div>}

          {items.length === 0 && editingId !== 'new' ? (
            <div className="text-center py-12 text-sm text-gray-400">
              No {section.label.toLowerCase()} yet.{' '}
              <button onClick={startNew} className="text-gray-900 underline">
                Add the first one.
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                // ── FAQ accordion ──────────────────────────────────────────
                if (activeTab === 'faqs') {
                  const isOpen = openFaqIds.has(item.id);
                  const itemForm = faqForms[item.id] ?? ({ ...item } as Record<string, unknown>);
                  return (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="px-4 py-3 flex items-center gap-4 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                        onClick={() => toggleFaq(item)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{item.question as string}</p>
                          {Boolean(item.category) && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.category as string}</p>
                          )}
                        </div>
                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <span className={`w-2 h-2 rounded-full ${item.isPublished ? 'bg-green-400' : 'bg-gray-300'}`} />
                          {confirmDelete === item.id ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              <span className="text-gray-600">Delete?</span>
                              <button onClick={() => handleDelete(item.id)} className="text-red-600 font-medium">Yes</button>
                              <button onClick={() => setConfirmDelete(null)} className="text-gray-500">No</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(item.id)}
                              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                          <span className={`text-gray-400 text-xs inline-block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                        </div>
                      </div>
                      <div className={`overflow-hidden transition-[max-height] duration-300 ease-out ${isOpen ? 'max-h-[600px]' : 'max-h-0'}`}>
                        <div className="px-5 pb-5 pt-4 border-t border-gray-100 space-y-4">
                          {gridFields.length > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                              {gridFields.map(field => (
                                <div key={field.key}>
                                  <label className={labelCls}>
                                    {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                                  </label>
                                  <FormField field={field} form={itemForm} onChange={(k, v) => setFaqField(item.id, k, v)} />
                                </div>
                              ))}
                            </div>
                          )}
                          {textareaFields.map(field => (
                            <div key={field.key}>
                              <label className={labelCls}>
                                {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                              </label>
                              <FormField field={field} form={itemForm} onChange={(k, v) => setFaqField(item.id, k, v)} />
                            </div>
                          ))}
                          {checkboxFields.length > 0 && (
                            <div className="flex flex-wrap gap-4">
                              {checkboxFields.map(field => (
                                <FormField key={field.key} field={field} form={itemForm} onChange={(k, v) => setFaqField(item.id, k, v)} />
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              onClick={() => saveFaq(item.id)}
                              disabled={savingFaqId === item.id}
                              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
                            >
                              {savingFaqId === item.id ? 'Saving…' : 'Save changes'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ── Generic row ────────────────────────────────────────────
                return editingId === item.id ? (
                  <div key={item.id}>{editForm}</div>
                ) : (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {section.itemLabel(item)}
                      </p>
                      {section.itemSublabel?.(item) && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {section.itemSublabel(item)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {section.hasPublished && (
                        <span
                          className={`w-2 h-2 rounded-full ${item.isPublished ? 'bg-green-400' : 'bg-gray-300'}`}
                          title={item.isPublished ? 'Published' : 'Draft'}
                        />
                      )}
                      <button
                        onClick={() => startEdit(item)}
                        className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        Edit
                      </button>
                      {confirmDelete === item.id ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className="text-gray-600">Delete?</span>
                          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 font-medium">Yes</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-gray-500 hover:text-gray-700">No</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(item.id)}
                          className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
