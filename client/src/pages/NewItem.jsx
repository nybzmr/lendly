import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ItemForm from '../components/ItemForm';

export default function NewItem() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await api.post('/items', formData);
      toast.success('Item listed successfully!');
      navigate(`/items/${res.data.item.id}`);
    } catch (err) {
      console.error('Failed to create item:', err);
      const msg = err.response?.data?.message || 'Failed to create item. Please check your inputs.';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-2"
        >
          ← Back to Browse
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          List an Item for Lending
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Share your tools, gear, or appliances with your community.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <ItemForm
          onSubmit={handleSubmit}
          submitting={submitting}
          submitText="List Item"
          serverError={serverError}
        />
      </div>
    </div>
  );
}
