import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../api/axios';
import { formatMoney } from '../../../utils/pricing';

const MAX_IMAGES = 10;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [marketplaceCategories, setMarketplaceCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const imageRef = useRef([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [moderation, setModeration] = useState({ status: '', rejectionReason: '' });
  const [form, setForm] = useState({ name: '', sku: '', brand: '', globalCategoryId: '', mrp: '', sellingPrice: '', tax: '0', discount: '0', stockQuantity: '0', description: '', highlights: '', weightKg: '0.5', lengthCm: '20', breadthCm: '15', heightCm: '10' });
  const [specifications, setSpecifications] = useState({});
  const selectedCategory = marketplaceCategories.find((item) => item._id === form.globalCategoryId);
  const specificationFields = useMemo(() => selectedCategory?.specificationDefinitions?.length
    ? selectedCategory.specificationDefinitions
    : (selectedCategory?.filterSchema || []), [selectedCategory]);

  useEffect(() => {
    api.get('/catalog/seller-categories').then((r) => setMarketplaceCategories(r.data?.data?.categories || [])).catch(() => setError('Marketplace categories are not configured. Run global category setup first.'));
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/products/${id}`).then((response) => {
      const product = response.data?.data?.product;
      if (!product) return;
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        brand: product.brand || '',
        globalCategoryId: product.globalCategoryId?._id || product.globalCategoryId || '',
        mrp: String(product.pricing?.mrp ?? ''),
        sellingPrice: String(product.pricing?.sellingPrice ?? ''),
        tax: String(product.pricing?.tax ?? '0'),
        discount: String(product.pricing?.discount ?? '0'),
        stockQuantity: String(product.inventory?.stockQuantity ?? '0'),
        description: product.description || '',
        highlights: (product.highlights || []).join('\n'),
        weightKg: String(product.logistics?.weightKg ?? '0.5'),
        lengthCm: String(product.logistics?.lengthCm ?? '20'),
        breadthCm: String(product.logistics?.breadthCm ?? '15'),
        heightCm: String(product.logistics?.heightCm ?? '10'),
      });
      setSpecifications(product.specifications || {});
      setExistingImages(product.images || []);
      setModeration({ status: product.status || '', rejectionReason: product.rejectionReason || '' });
    }).catch(() => setError('Unable to load this product.'));
  }, [id]);

  useEffect(() => { imageRef.current = images; }, [images]);
  useEffect(() => () => imageRef.current.forEach((image) => URL.revokeObjectURL(image.preview)), []);

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === 'globalCategoryId') setSpecifications({});
  };

  const chooseImages = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (existingImages.length + images.length + files.length > MAX_IMAGES) return setError(`Maximum ${MAX_IMAGES} images are allowed.`);
    if (files.some((file) => !IMAGE_TYPES.includes(file.type) || file.size > 5 * 1024 * 1024)) return setError('Use JPG, PNG, or WEBP images up to 5 MB each.');
    setError('');
    setImages((current) => [...current, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  };

  const removeImage = (index) => setImages((current) => {
    URL.revokeObjectURL(current[index].preview);
    return current.filter((_, position) => position !== index);
  });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!isEdit && !images.length) return setError('Add at least one product image.');
    if (specificationFields.some((definition) => definition.required !== false && !String(specifications[definition.key] || '').trim())) return setError('Complete all category-specific product specifications.');
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/products/${id}`, {
          name: form.name,
          sku: form.sku,
          brand: form.brand,
          globalCategoryId: form.globalCategoryId,
          mrp: form.mrp,
          sellingPrice: form.sellingPrice,
          tax: form.tax,
          discount: form.discount,
          description: form.description,
          highlights: form.highlights.split('\n').map((item) => item.trim()).filter(Boolean),
          weightKg: form.weightKg,
          lengthCm: form.lengthCm,
          breadthCm: form.breadthCm,
          heightCm: form.heightCm,
          specifications,
        });
        if (images.length) {
          const imageData = new FormData();
          images.forEach(({ file }) => imageData.append('images', file));
          await api.patch(`/products/${id}/images`, imageData, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      } else {
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        data.append('specifications', JSON.stringify(specifications));
        data.append('highlights', JSON.stringify(form.highlights.split('\n').map((item) => item.trim()).filter(Boolean)));
        images.forEach(({ file }) => data.append('images', file));
        await api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
      }
      navigate('/admin/products');
    } catch (requestError) {
      setError(requestError.response?.data?.message || (isEdit ? 'Unable to update product.' : 'Unable to create product.'));
    } finally {
      setSaving(false);
    }
  };

  const field = (label, name, options = {}) => (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input name={name} value={form[name]} onChange={change} className="mt-1 w-full rounded-lg border p-2 font-normal" {...options} />
    </label>
  );
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit product' : 'Add product'}</h1>
        <p className="text-sm text-slate-500">
          {isEdit
            ? 'Changes to title, brand, marketplace category, description, images, or specifications are published immediately.'
            : 'Category data decides where buyers find your approved product.'}
        </p>
      </div>
      {isEdit && moderation.status ? (
        <div className={`rounded-xl border p-4 text-sm ${moderation.status === 'REJECTED' ? 'border-red-200 bg-red-50 text-red-800' : moderation.status === 'PENDING_REVIEW' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
          <p className="font-bold">Moderation status: {moderation.status.replace('_', ' ')}</p>
          {moderation.status === 'REJECTED' && moderation.rejectionReason ? <p className="mt-1">Rejection reason: {moderation.rejectionReason}</p> : null}
        </div>
      ) : null}
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        {error && <p className="md:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {field('Product name', 'name', { required: true })}
        {field('Seller SKU', 'sku', { required: true, disabled: isEdit })}
        {field('Brand', 'brand')}
        <label className="text-sm font-bold text-slate-700">
          Marketplace category
          <select name="globalCategoryId" value={form.globalCategoryId} onChange={change} required className="mt-1 w-full rounded-lg border p-2 font-normal">
            <option value="">Select buyer category</option>
            {marketplaceCategories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
        </label>
        {field('MRP', 'mrp', { type: 'number', min: '0', required: true })}
        {field('Selling price', 'sellingPrice', { type: 'number', min: '0', required: true })}
        {field('GST / tax rate (%)', 'tax', { type: 'number', min: '0', max: '100', step: '0.01', required: true })}
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <p className="font-bold">Buyer final price (including GST)</p>
          <p className="mt-1 text-lg font-black">
            {formatMoney(Number(form.sellingPrice || 0) * (1 + Number(form.tax || 0) / 100))}
          </p>
          <p className="text-xs">This is the amount shown to the buyer. Shipping is free.</p>
        </div>
        {field('Discount (%)', 'discount', { type: 'number', min: '0', max: '100', required: true })}
        {!isEdit && field('Opening stock', 'stockQuantity', { type: 'number', min: '0', required: true })}
        {specificationFields.length > 0 && (
          <section className="md:col-span-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <h2 className="font-bold text-slate-800">Required {selectedCategory.name} specifications</h2>
            <p className="mb-3 text-xs text-slate-600">These details are shown to buyers as soon as the product is saved.</p>
            <div className="grid gap-3 md:grid-cols-3">
              {specificationFields.map((definition) => (
                <label key={definition.key} className="text-sm font-bold text-slate-700">
                  {definition.label}
                  <input required={definition.required !== false} type={definition.type === 'number' ? 'number' : 'text'} value={specifications[definition.key] || ''} onChange={(event) => setSpecifications({ ...specifications, [definition.key]: event.target.value })} placeholder={definition.options?.length ? definition.options.join(', ') : ''} className="mt-1 w-full rounded-lg border p-2 font-normal" />
                </label>
              ))}
            </div>
          </section>
        )}
        <section className="md:col-span-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-4">
          <div className="flex justify-between gap-3">
            <div>
              <h2 className="font-bold">Product images {isEdit ? '' : '*'}</h2>
              <p className="text-xs text-slate-600">1–10 JPG, PNG, or WEBP images; first is main image.</p>
            </div>
            <strong className="text-sm text-blue-700">{existingImages.length + images.length}/{MAX_IMAGES}</strong>
          </div>
          {existingImages.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-5">
              {existingImages.map((image) => (
                <div className="overflow-hidden rounded border" key={image.publicId || image.url}>
                  <img className="h-20 w-full object-cover" src={image.url} alt="Current product" />
                </div>
              ))}
            </div>
          )}
          <label className="mt-4 block cursor-pointer rounded-lg border-2 border-dashed bg-white p-5 text-center text-sm font-bold text-blue-700">
            {isEdit ? 'Add more images' : 'Choose images'}
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages} disabled={existingImages.length + images.length === MAX_IMAGES} />
          </label>
          <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-5">
            {images.map((image, index) => (
              <div className="relative overflow-hidden rounded border" key={`${image.file.name}-${index}`}>
                <img className="h-20 w-full object-cover" src={image.preview} alt="Product preview" />
                <button type="button" onClick={() => removeImage(index)} className="absolute right-1 top-1 rounded bg-red-600 px-1.5 text-white">×</button>
              </div>
            ))}
          </div>
        </section>
        <p className="md:col-span-2 pt-2 text-sm font-bold">Parcel details</p>
        {field('Weight (kg)', 'weightKg', { type: 'number', min: '0.05', step: '0.01', required: true })}
        {field('Length (cm)', 'lengthCm', { type: 'number', min: '1', required: true })}
        {field('Breadth (cm)', 'breadthCm', { type: 'number', min: '1', required: true })}
        {field('Height (cm)', 'heightCm', { type: 'number', min: '1', required: true })}
        <label className="md:col-span-2 text-sm font-bold text-slate-700">
          Description
          <textarea name="description" value={form.description} onChange={change} className="mt-1 w-full rounded-lg border p-2 font-normal" rows="3" />
        </label>
        <label className="md:col-span-2 text-sm font-bold text-slate-700">
          Product highlights
          <textarea name="highlights" value={form.highlights} onChange={change} className="mt-1 w-full rounded-lg border p-2 font-normal" rows="5" placeholder="One buyer-facing highlight per line&#10;Example: 4K UHD display&#10;Example: 1 year manufacturer warranty" />
          <span className="mt-1 block text-xs font-normal text-slate-500">These bullets appear in the buyer product page.</span>
        </label>
        <div className="md:col-span-2 flex gap-3">
          <button disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white disabled:opacity-60">
            {saving ? (isEdit ? 'Saving…' : 'Publishing…') : (isEdit ? 'Save product' : 'Publish product')}
          </button>
          <button type="button" onClick={() => navigate('/admin/products')} className="rounded-lg border px-5 py-2">Cancel</button>
        </div>
      </form>
    </div>
  );
}
