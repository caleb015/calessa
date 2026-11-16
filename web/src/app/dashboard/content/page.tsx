'use client';

import { useEffect, useState, useCallback, useId, useRef } from 'react';
import { adminApi } from '@/lib/adminApi';
import ImagePreview from '@/components/dashboard/ImagePreview';
import ImageUploadButton from '@/components/dashboard/ImageUploadButton';
import ImageListField from '@/components/dashboard/ImageListField';
import GallerySettingsEditor from '@/components/dashboard/GallerySettingsEditor';
import { fitHeightUrl, thumbnailUrl } from '@/lib/upload';
import DetailsPageEditor from '@/components/dashboard/DetailsPageEditor';
import DressCodeSettingsEditor from '@/components/dashboard/DressCodeSettingsEditor';
import { toLocalDateTimeInput, fromLocalDateTimeInput } from '@/lib/datetime';

type FieldType = 'text' | 'textarea' | 'datetime' | 'number' | 'checkbox' | 'email' | 'image' | 'images';

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  suggestions?: string[];
}

type Item = Record<string, unknown> & { id: string };

/** Name of the guest who uploaded a gallery photo, if a guest did. */
const sharedBy = (item: Item) => (item.guest as { primaryName?: string } | null | undefined)?.primaryName ?? null;

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
  /** Rendered above the item list (e.g. section-wide settings). */
  header?: React.ReactNode;
  /** Wording for the empty state, defaults to the lowercased label. */
  emptyLabel?: string;
  /** Small image shown at the start of each row. */
  thumbnail?: (item: Item) => string | null;
  /** Photos shown in a strip under the row's text (whole, in order). */
  photos?: (item: Item) => string[];
  /** Show an "Upload photos" button that adds one published item per chosen image. */
  bulkImageUpload?: boolean;
  /** Show a one-click Publish button on unpublished items. */
  quickPublish?: boolean;
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
    itemSublabel: (item) => [item.tagline, item.venueName].filter(Boolean).join(' · ') as string,
    fields: [
      { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'e.g. Where forever begins' },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'venueName', label: 'Venue', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'startTime', label: 'Start Time', type: 'datetime' },
      { key: 'endTime', label: 'End Time', type: 'datetime' },
      { key: 'mapUrl', label: 'Map URL', type: 'text', placeholder: 'https://maps.google.com/…' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
      { key: 'showOnHomepage', label: 'Show on homepage', type: 'checkbox' },
    ],
  },
  {
    key: 'dressCode',
    label: 'Dress Code',
    singular: 'Guideline',
    emptyLabel: 'guidelines',
    apiGet: () => adminApi.getDressCodeGuidelines(),
    apiCreate: (b) => adminApi.createDressCodeGuideline(b),
    apiUpdate: (id, b) => adminApi.updateDressCodeGuideline(id, b),
    apiDelete: (id) => adminApi.deleteDressCodeGuideline(id),
    hasPublished: false,
    header: <DressCodeSettingsEditor />,
    itemLabel: (item) => item.label as string,
    itemSublabel: (item) => [item.text, item.note].filter(Boolean).join(' — ') as string,
    photos: (item) => (item.imageUrls as string[] | undefined) ?? [],
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g. For the Ladies' },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
      { key: 'text', label: 'Guidance', type: 'textarea', required: true, placeholder: 'e.g. Elegant maxi or midi dresses…' },
      { key: 'note', label: 'Note (optional)', type: 'textarea', placeholder: 'e.g. Please avoid white and beige.' },
      { key: 'imageUrls', label: 'Example outfit photos (optional)', type: 'images' },
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
    itemLabel: (item) => (item.title as string) || (sharedBy(item) ? `Photo from ${sharedBy(item)}` : item.imageUrl as string),
    itemSublabel: (item) => [
      sharedBy(item) && !item.isPublished ? 'Pending approval' : null,
      sharedBy(item) && item.title ? `Shared by ${sharedBy(item)}` : null,
    ].filter(Boolean).join(' · '),
    thumbnail: (item) => item.imageUrl as string,
    quickPublish: true,
    bulkImageUpload: true,
    header: <GallerySettingsEditor />,
    emptyLabel: 'photos',
    fields: [
      { key: 'imageUrl', label: 'Image URL', type: 'image', required: true, placeholder: 'Upload an image or paste a link' },
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
      { key: 'imageUrl', label: 'Image URL', type: 'image', placeholder: 'Upload an image or paste a link' },
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

// Only send the fields the form edits, so extra fields returned by the API can't be echoed back.
const DETAILS_PAGE_TAB = 'detailsPage';
/** Items listed per page, so a gallery of thousands stays quick to scroll and edit. */
const PAGE_SIZE = 50;
/** Photos uploaded at once by "Upload photos". */
const BULK_UPLOAD_CONCURRENCY = 3;
const TABS = [
  { key: SECTIONS[0].key, label: SECTIONS[0].label },
  { key: DETAILS_PAGE_TAB, label: 'Details Page' },
  ...SECTIONS.slice(1).map(s => ({ key: s.key, label: s.label })),
];

function pickFields(item: Record<string, unknown>, fields: FieldConfig[]) {
  return Object.fromEntries(fields.filter(f => f.key in item).map(f => [f.key, item[f.key]]));
}

const inputCls = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

function FormField({
  field,
  form,
  onChange,
  onUploadBusy,
}: {
  field: FieldConfig;
  form: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  /** Image fields report while an upload is running, so Save can wait for it. */
  onUploadBusy?: (key: string, busy: boolean) => void;
}) {
  const value = form[field.key];
  const listId = useId();

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
    const dateVal = value ? toLocalDateTimeInput(value as string) : '';
    return (
      <input
        type="datetime-local"
        className={inputCls}
        value={dateVal}
        onChange={e => onChange(field.key, fromLocalDateTimeInput(e.target.value))}
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

  if (field.type === 'images') {
    return (
      <ImageListField
        value={(value as string[] | undefined) ?? []}
        onChange={urls => onChange(field.key, urls)}
        onBusyChange={busy => onUploadBusy?.(field.key, busy)}
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
        <ImageUploadButton onUploaded={url => onChange(field.key, url)} onBusyChange={busy => onUploadBusy?.(field.key, busy)} />
        <ImagePreview src={(value as string) ?? ''} />
      </div>
    );
  }

  return (
    <>
      <input
        type={field.type}
        className={inputCls}
        placeholder={field.placeholder}
        list={field.suggestions ? listId : undefined}
        value={(value as string) ?? ''}
        onChange={e => onChange(field.key, e.target.value)}
      />
      {field.suggestions && (
        <datalist id={listId}>
          {field.suggestions.map(s => <option key={s} value={s} />)}
        </datalist>
      )}
    </>
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const section = SECTIONS.find(s => s.key === activeTab) ?? SECTIONS[0];
  const items = allItems[activeTab] ?? [];

  // Paging, plus a filter for photos waiting for approval (they'd otherwise be spread across pages).
  const [page, setPage] = useState(0);
  const [pendingOnly, setPendingOnly] = useState(false);
  const pendingCount = section.quickPublish ? items.filter(it => !it.isPublished).length : 0;
  const listed = pendingOnly && pendingCount > 0 ? items.filter(it => !it.isPublished) : items;
  const pageCount = Math.max(1, Math.ceil(listed.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleItems = listed.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const switchTab = (key: string) => {
    setActiveTab(key);
    setEditingId(null);
    setFormState({});
    setError(null);
    setConfirmDelete(null);
    setOpenFaqIds(new Set());
    setFaqForms({});
    setBulkAdded(null);
    setPage(0);
    setPendingOnly(false);
    bulkRunning.current = false;
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

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const handleQuickPublish = async (id: string) => {
    setPublishingId(id);
    setError(null);
    try {
      const updated = await section.apiUpdate(id, { isPublished: true }) as Item;
      setAllItems(prev => ({ ...prev, [activeTab]: prev[activeTab].map(it => (it.id === id ? updated : it)) }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish.');
    } finally {
      setPublishingId(null);
    }
  };

  // Image fields with an upload still running; saving waits until they finish.
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set());
  const setUploadBusy = useCallback((key: string, busy: boolean) => {
    setUploadingFields(prev => {
      if (prev.has(key) === busy) return prev;
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  // "Upload photos": each uploaded image becomes its own published item, added after the others
  // in the order the files were chosen. Afterwards the list shows the last page, where they are.
  const [bulkAdded, setBulkAdded] = useState<number | null>(null);
  const bulkOrder = useRef(0);
  const bulkRunning = useRef(false);
  const startBulkUpload = (busy: boolean) => {
    if (!busy) {
      // The button also reports "not busy" when it goes away (e.g. on another tab); ignore that.
      if (!bulkRunning.current) return;
      bulkRunning.current = false;
      setPendingOnly(false);
      setPage(Number.MAX_SAFE_INTEGER);
      return;
    }
    bulkRunning.current = true;
    bulkOrder.current = items.reduce((max, it) => Math.max(max, Number(it.displayOrder) || 0), -1) + 1;
    setBulkAdded(0);
    setError(null);
  };
  const addUploadedImage = async (imageUrl: string, index: number) => {
    const target = section;
    const displayOrder = bulkOrder.current + index;
    try {
      const created = await target.apiCreate({ imageUrl, isPublished: true, displayOrder }) as Item;
      setAllItems(prev => ({ ...prev, [target.key]: [...(prev[target.key] ?? []), created] }));
      setBulkAdded(n => (n ?? 0) + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? `Uploaded, but couldn't add a photo: ${err.message}` : "Uploaded, but couldn't add a photo.");
    }
  };

  const setField = (key: string, value: unknown) =>
    setFormState(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId === 'new') {
        const created = await section.apiCreate(pickFields(form, section.fields)) as Item;
        setAllItems(prev => ({ ...prev, [activeTab]: [...(prev[activeTab] ?? []), created] }));
      } else {
        const updated = await section.apiUpdate(editingId!, pickFields(form, section.fields)) as Item;
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
      const updated = await section.apiUpdate(id, pickFields(faqForms[id], section.fields)) as Item;
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

  const gridFields = section.fields.filter(f => !['textarea', 'images', 'checkbox'].includes(f.type));
  const textareaFields = section.fields.filter(f => f.type === 'textarea' || f.type === 'images');
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
              <FormField field={field} form={form} onChange={setField} onUploadBusy={setUploadBusy} />
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
          <FormField field={field} form={form} onChange={setField} onUploadBusy={setUploadBusy} />
        </div>
      ))}
      {checkboxFields.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {checkboxFields.map(field => (
            <FormField key={field.key} field={field} form={form} onChange={setField} onUploadBusy={setUploadBusy} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || uploadingFields.size > 0}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : uploadingFields.size > 0 ? 'Waiting for upload…' : editingId === 'new' ? `Add ${section.singular.toLowerCase()}` : 'Save changes'}
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

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto whitespace-nowrap">
        {TABS.map(s => (
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

      {activeTab === DETAILS_PAGE_TAB ? (
        <DetailsPageEditor />
      ) : loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          {section.header}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
            <div className="flex flex-wrap items-start justify-end gap-2">
              {section.bulkImageUpload && (
                <ImageUploadButton
                  multiple
                  concurrency={BULK_UPLOAD_CONCURRENCY}
                  label="Upload photos"
                  className="text-right"
                  onBusyChange={startBulkUpload}
                  onUploaded={addUploadedImage}
                />
              )}
              {editingId !== 'new' && (
                <button
                  onClick={startNew}
                  className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
                >
                  + Add {section.singular.toLowerCase()}
                </button>
              )}
            </div>
          </div>
          {section.bulkImageUpload && bulkAdded != null && bulkAdded > 0 && (
            <p role="status" className="text-sm text-green-600 -mt-2 mb-4">
              {bulkAdded} {bulkAdded === 1 ? 'photo' : 'photos'} added to the gallery.
            </p>
          )}

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {pendingCount > 0 && (
            <div className="flex gap-1 mb-3 text-xs" role="group" aria-label="Show">
              {[
                { pending: false, label: `All (${items.length})` },
                { pending: true, label: `Pending approval (${pendingCount})` },
              ].map(f => (
                <button
                  key={f.label}
                  onClick={() => { setPendingOnly(f.pending); setPage(0); }}
                  aria-pressed={pendingOnly === f.pending}
                  className={`px-2.5 py-1 rounded-full border transition-colors ${
                    pendingOnly === f.pending ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {editingId === 'new' && <div className="mb-3">{editForm}</div>}

          {items.length === 0 && editingId !== 'new' ? (
            <div className="text-center py-12 text-sm text-gray-400">
              No {section.emptyLabel ?? section.label.toLowerCase()} yet.{' '}
              <button onClick={startNew} className="text-gray-900 underline">
                Add the first one.
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleItems.map(item => {
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
                    {section.thumbnail?.(item) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnailUrl(section.thumbnail(item)!)}
                        alt=""
                        loading="lazy"
                        // Very large animations can't be resized on the free plan; fall back to the original.
                        onError={e => { if (e.currentTarget.src !== section.thumbnail!(item)) e.currentTarget.src = section.thumbnail!(item)!; }}
                        className="w-12 h-12 rounded object-cover border border-gray-100 shrink-0 bg-gray-50"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {section.itemLabel(item)}
                      </p>
                      {section.itemSublabel?.(item) && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {section.itemSublabel(item)}
                        </p>
                      )}
                      {(section.photos?.(item).length ?? 0) > 0 && (
                        <ul className="flex flex-wrap gap-2 mt-2" aria-label={`Photos for ${section.itemLabel(item)}`}>
                          {section.photos!(item).map((url, i) => (
                            <li key={url}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={fitHeightUrl(url, 384)}
                                alt={`${section.itemLabel(item)} photo ${i + 1}`}
                                loading="lazy"
                                onError={e => { if (e.currentTarget.src !== url) e.currentTarget.src = url; }}
                                className="h-48 w-auto max-w-[20rem] object-contain rounded border border-gray-100 bg-gray-50"
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {section.hasPublished && (
                        <span
                          className={`w-2 h-2 rounded-full ${item.isPublished ? 'bg-green-400' : 'bg-gray-300'}`}
                          title={item.isPublished ? 'Published' : 'Draft'}
                        />
                      )}
                      {section.quickPublish && !item.isPublished && (
                        <button
                          onClick={() => handleQuickPublish(item.id)}
                          disabled={publishingId === item.id}
                          className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-2.5 py-1 rounded transition-colors disabled:opacity-50"
                        >
                          {publishingId === item.id ? 'Publishing…' : 'Publish'}
                        </button>
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

          {pageCount > 1 && (
            <nav className="flex items-center justify-between mt-4 text-sm" aria-label="Pages">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-gray-500">
                {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, listed.length)} of {listed.length}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
