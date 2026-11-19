import { useState, useEffect } from 'react';
import { CATEGORIES } from '../utils/constants';

export default function ItemForm({
  initialData = {},
  onSubmit,
  submitting = false,
  submitText = 'Save Item',
  serverError = null,
}) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    category: initialData.category || CATEGORIES[0],
    pricePerDay: initialData.pricePerDay !== undefined ? initialData.pricePerDay.toString() : '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initialData.imageUrl || null);
  const [errors, setErrors] = useState({});

  // Cleanup object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const validate = () => {
    const errs = {};
    const titleTrimmed = formData.title.trim();
    if (!titleTrimmed || titleTrimmed.length < 3 || titleTrimmed.length > 80) {
      errs.title = 'Title must be between 3 and 80 characters';
    }

    const descTrimmed = formData.description.trim();
    if (!descTrimmed || descTrimmed.length < 1 || descTrimmed.length > 1000) {
      errs.description = 'Description must be between 1 and 1000 characters';
    }

    if (!formData.category || !CATEGORIES.includes(formData.category)) {
      errs.category = 'Please select a valid category';
    }

    const price = parseInt(formData.pricePerDay, 10);
    if (isNaN(price) || price < 1 || !Number.isInteger(Number(formData.pricePerDay))) {
      errs.pricePerDay = 'Price per day must be a whole number of at least ₹1';
    }

    if (imageFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(imageFile.type)) {
        errs.image = 'Only JPG, PNG, and WebP images are allowed';
      } else if (imageFile.size > 3 * 1024 * 1024) {
        errs.image = 'Image size must be 3 MB or less';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      if (errors.image) {
        setErrors((prev) => ({ ...prev, image: null }));
      }
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(initialData.imageUrl || null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const data = new FormData();
    data.append('title', formData.title.trim());
    data.append('description', formData.description.trim());
    data.append('category', formData.category);
    data.append('pricePerDay', parseInt(formData.pricePerDay, 10).toString());

    if (imageFile) {
      data.append('image', imageFile);
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {serverError}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
          Item Title <span className="text-rose-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Bosch Cordless Power Drill"
          maxLength={80}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.title ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300'
          }`}
        />
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>{errors.title ? <span className="text-rose-600">{errors.title}</span> : 'Between 3 and 80 characters'}</span>
          <span>{formData.title.length}/80</span>
        </div>
      </div>

      {/* Category and Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
            Category <span className="text-rose-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.category ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300'
            }`}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-rose-600">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="pricePerDay" className="block text-sm font-medium text-slate-700 mb-1">
            Price per Day (₹) <span className="text-rose-500">*</span>
          </label>
          <div className="relative rounded-lg shadow-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              ₹
            </div>
            <input
              id="pricePerDay"
              name="pricePerDay"
              type="number"
              min="1"
              step="1"
              value={formData.pricePerDay}
              onChange={handleChange}
              placeholder="150"
              className={`w-full rounded-lg border pl-8 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.pricePerDay ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300'
              }`}
            />
          </div>
          {errors.pricePerDay && <p className="mt-1 text-xs text-rose-600">{errors.pricePerDay}</p>}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
          Description <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe your item, accessories included, and any conditions for borrowing..."
          maxLength={1000}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.description ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300'
          }`}
        />
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>{errors.description ? <span className="text-rose-600">{errors.description}</span> : 'Up to 1000 characters'}</span>
          <span>{formData.description.length}/1000</span>
        </div>
      </div>

      {/* Image File Input with Live Preview */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Item Image <span className="text-xs font-normal text-slate-500">(Optional, JPG/PNG/WebP, max 3 MB)</span>
        </label>

        {imagePreview ? (
          <div className="relative inline-block rounded-xl overflow-hidden border border-slate-200 shadow-xs mb-3">
            <img
              src={imagePreview}
              alt="Item preview"
              className="h-48 w-64 object-cover"
            />
            {imageFile && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900 transition-colors shadow-xs"
                title="Remove chosen image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : null}

        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors cursor-pointer"
        />
        {errors.image && <p className="mt-1 text-xs text-rose-600">{errors.image}</p>}
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {submitting ? 'Saving...' : submitText}
        </button>
      </div>
    </form>
  );
}
