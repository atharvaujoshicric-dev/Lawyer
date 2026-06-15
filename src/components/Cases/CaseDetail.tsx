import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, X, Trash2, Calendar, Shield, Home, FileText, AlertTriangle, Clock } from 'lucide-react';
import { tauriService } from '../../services/tauri';
import { useStore } from '../../store';
import { Case, CaseType } from '../../types';
import PageHeader from '../Shared/PageHeader';
import Modal from '../Shared/Modal';

const STATUS_OPTIONS = ['Active', 'Pending', 'Closed', 'On Hold', 'Archived'];
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const BREACH_TYPES = [
  'Ransomware Attack',
  'Data Exfiltration',
  'Phishing / Social Engineering',
  'Insider Threat',
  'DDoS Attack',
  'Unauthorized Access',
  'Malware Infection',
  'Supply Chain Attack',
  'Zero-Day Exploit',
  'Other',
];
const PROPERTY_TYPES = ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Mixed Use'];

export default function CaseDetail() {
  const { clientId, caseId } = useParams<{ clientId: string; caseId: string }>();
  const navigate = useNavigate();
  const { showToast } = useStore();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Case>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (caseId) loadCase();
  }, [caseId]);

  const loadCase = async () => {
    setLoading(true);
    try {
      const result = await tauriService.getCaseById(caseId!);
      setCaseData(result);
      setEditForm(result);
    } catch (err) {
      showToast('Failed to load case details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!caseData) return;
    setSaving(true);
    try {
      await tauriService.updateCase({ ...editForm, id: caseData.id } as Case);
      setCaseData({ ...caseData, ...editForm } as Case);
      setIsEditing(false);
      showToast('Case updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update case', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!caseData) return;
    setDeleting(true);
    try {
      await tauriService.deleteCase(caseData.id);
      showToast('Case deleted', 'success');
      navigate(`/clients/${clientId}`);
    } catch (err) {
      showToast('Failed to delete case', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setEditForm(caseData || {});
    setIsEditing(false);
  };

  const updateField = (field: keyof Case, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    return diff;
  };

  const getUrgencyColor = (days: number | null) => {
    if (days === null) return '';
    if (days < 0) return 'var(--danger)';
    if (days <= 7) return 'var(--danger)';
    if (days <= 30) return 'var(--warning)';
    if (days <= 60) return 'var(--gold)';
    return 'var(--success)';
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Active: 'badge-success',
      Pending: 'badge-warning',
      Closed: 'badge-default',
      'On Hold': 'badge-warning',
      Archived: 'badge-default',
    };
    return map[status] || 'badge-default';
  };

  const getCaseTypeIcon = (type: CaseType) => {
    switch (type) {
      case 'Cybersecurity': return <Shield size={20} />;
      case 'Rental': return <Home size={20} />;
      default: return <FileText size={20} />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Case not found.</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>
          Go Back
        </button>
      </div>
    );
  }

  const deadlineDays = getDaysUntil(
    caseData.case_type === 'Cybersecurity' ? caseData.regulatory_deadline : caseData.agreement_expiry_date
  );

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/clients/${clientId}`)}
          style={{ padding: '0.5rem', marginTop: 4 }}
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--gold)' }}>{getCaseTypeIcon(caseData.case_type)}</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {caseData.title}
            </h1>
            <span className={`badge ${getStatusBadge(caseData.status)}`}>{caseData.status}</span>
          </div>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            {caseData.case_type} Matter &nbsp;·&nbsp; Case #{caseData.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                <X size={16} /> Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
                Save
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={16} style={{ color: 'var(--danger)' }} />
              </button>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Deadline Alert Banner */}
      {deadlineDays !== null && deadlineDays <= 60 && (
        <div
          style={{
            background: `${getUrgencyColor(deadlineDays)}22`,
            border: `1px solid ${getUrgencyColor(deadlineDays)}`,
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertTriangle size={18} style={{ color: getUrgencyColor(deadlineDays), flexShrink: 0 }} />
          <span style={{ color: getUrgencyColor(deadlineDays), fontWeight: 500, fontSize: '0.9rem' }}>
            {deadlineDays < 0
              ? `Deadline passed ${Math.abs(deadlineDays)} days ago`
              : `${deadlineDays} day${deadlineDays !== 1 ? 's' : ''} until ${caseData.case_type === 'Cybersecurity' ? 'regulatory deadline' : 'agreement expiry'}`}
          </span>
        </div>
      )}

      {/* Core Fields */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Case Details</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

            <FormField label="Case Title">
              {isEditing ? (
                <input
                  className="form-input"
                  value={editForm.title || ''}
                  onChange={e => updateField('title', e.target.value)}
                />
              ) : (
                <p style={valueStyle}>{caseData.title}</p>
              )}
            </FormField>

            <FormField label="Status">
              {isEditing ? (
                <select
                  className="form-input"
                  value={editForm.status || ''}
                  onChange={e => updateField('status', e.target.value)}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <span className={`badge ${getStatusBadge(caseData.status)}`}>{caseData.status}</span>
              )}
            </FormField>

            <FormField label="Case Type">
              <p style={valueStyle}>{caseData.case_type}</p>
            </FormField>

            <FormField label="Date Opened">
              <p style={valueStyle}>{caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : '—'}</p>
            </FormField>

            <FormField label="Notes" fullWidth>
              {isEditing ? (
                <textarea
                  className="form-input"
                  value={editForm.notes || ''}
                  onChange={e => updateField('notes', e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              ) : (
                <p style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{caseData.notes || '—'}</p>
              )}
            </FormField>

          </div>
        </div>
      </div>

      {/* Cybersecurity Fields */}
      {caseData.case_type === 'Cybersecurity' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={16} style={{ color: 'var(--gold)' }} /> Cybersecurity Details
            </h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

              <FormField label="Incident Date">
                {isEditing ? (
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.incident_date || ''}
                    onChange={e => updateField('incident_date', e.target.value)}
                  />
                ) : (
                  <p style={valueStyle}>{caseData.incident_date ? new Date(caseData.incident_date).toLocaleDateString() : '—'}</p>
                )}
              </FormField>

              <FormField label="Breach Type">
                {isEditing ? (
                  <select
                    className="form-input"
                    value={editForm.breach_type || ''}
                    onChange={e => updateField('breach_type', e.target.value)}
                  >
                    <option value="">Select type</option>
                    {BREACH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <p style={valueStyle}>{caseData.breach_type || '—'}</p>
                )}
              </FormField>

              <FormField label="Severity">
                {isEditing ? (
                  <select
                    className="form-input"
                    value={editForm.severity || ''}
                    onChange={e => updateField('severity', e.target.value)}
                  >
                    <option value="">Select severity</option>
                    {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <SeverityBadge value={caseData.severity} />
                )}
              </FormField>

              <FormField label="Regulatory Body">
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editForm.regulatory_body || ''}
                    onChange={e => updateField('regulatory_body', e.target.value)}
                    placeholder="e.g. CERT-In, SEBI, RBI"
                  />
                ) : (
                  <p style={valueStyle}>{caseData.regulatory_body || '—'}</p>
                )}
              </FormField>

              <FormField label="Regulatory Deadline">
                {isEditing ? (
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.regulatory_deadline || ''}
                    onChange={e => updateField('regulatory_deadline', e.target.value)}
                  />
                ) : (
                  <DeadlineDisplay date={caseData.regulatory_deadline} />
                )}
              </FormField>

              <FormField label="Affected Systems">
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editForm.affected_systems || ''}
                    onChange={e => updateField('affected_systems', e.target.value)}
                    placeholder="e.g. Payment servers, HR database"
                  />
                ) : (
                  <p style={valueStyle}>{caseData.affected_systems || '—'}</p>
                )}
              </FormField>

              <FormField label="Data Compromised" fullWidth>
                {isEditing ? (
                  <textarea
                    className="form-input"
                    value={editForm.data_compromised || ''}
                    onChange={e => updateField('data_compromised', e.target.value)}
                    rows={2}
                    placeholder="Describe the nature of compromised data"
                  />
                ) : (
                  <p style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{caseData.data_compromised || '—'}</p>
                )}
              </FormField>

              <FormField label="Containment Status" fullWidth>
                {isEditing ? (
                  <textarea
                    className="form-input"
                    value={editForm.containment_status || ''}
                    onChange={e => updateField('containment_status', e.target.value)}
                    rows={2}
                    placeholder="Current containment and remediation steps"
                  />
                ) : (
                  <p style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{caseData.containment_status || '—'}</p>
                )}
              </FormField>

              <FormField label="Notification Sent">
                {isEditing ? (
                  <select
                    className="form-input"
                    value={editForm.notification_sent ? 'true' : 'false'}
                    onChange={e => updateField('notification_sent', e.target.value === 'true')}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                ) : (
                  <span className={`badge ${caseData.notification_sent ? 'badge-success' : 'badge-warning'}`}>
                    {caseData.notification_sent ? 'Sent' : 'Pending'}
                  </span>
                )}
              </FormField>

            </div>
          </div>
        </div>
      )}

      {/* Rental Fields */}
      {caseData.case_type === 'Rental' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Home size={16} style={{ color: 'var(--gold)' }} /> Rental Agreement Details
            </h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

              <FormField label="Property Type">
                {isEditing ? (
                  <select
                    className="form-input"
                    value={editForm.property_type || ''}
                    onChange={e => updateField('property_type', e.target.value)}
                  >
                    <option value="">Select type</option>
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <p style={valueStyle}>{caseData.property_type || '—'}</p>
                )}
              </FormField>

              <FormField label="Monthly Rent">
                {isEditing ? (
                  <input
                    type="number"
                    className="form-input"
                    value={editForm.monthly_rent || ''}
                    onChange={e => updateField('monthly_rent', parseFloat(e.target.value))}
                    placeholder="₹"
                  />
                ) : (
                  <p style={valueStyle}>
                    {caseData.monthly_rent ? `₹${Number(caseData.monthly_rent).toLocaleString('en-IN')}` : '—'}
                  </p>
                )}
              </FormField>

              <FormField label="Security Deposit">
                {isEditing ? (
                  <input
                    type="number"
                    className="form-input"
                    value={editForm.security_deposit || ''}
                    onChange={e => updateField('security_deposit', parseFloat(e.target.value))}
                    placeholder="₹"
                  />
                ) : (
                  <p style={valueStyle}>
                    {caseData.security_deposit ? `₹${Number(caseData.security_deposit).toLocaleString('en-IN')}` : '—'}
                  </p>
                )}
              </FormField>

              <FormField label="Lock-in Period">
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editForm.lock_in_period || ''}
                    onChange={e => updateField('lock_in_period', e.target.value)}
                    placeholder="e.g. 11 months"
                  />
                ) : (
                  <p style={valueStyle}>{caseData.lock_in_period || '—'}</p>
                )}
              </FormField>

              <FormField label="Agreement Start">
                {isEditing ? (
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.agreement_start_date || ''}
                    onChange={e => updateField('agreement_start_date', e.target.value)}
                  />
                ) : (
                  <p style={valueStyle}>{caseData.agreement_start_date ? new Date(caseData.agreement_start_date).toLocaleDateString() : '—'}</p>
                )}
              </FormField>

              <FormField label="Agreement Expiry">
                {isEditing ? (
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.agreement_expiry_date || ''}
                    onChange={e => updateField('agreement_expiry_date', e.target.value)}
                  />
                ) : (
                  <DeadlineDisplay date={caseData.agreement_expiry_date} label="Expires" />
                )}
              </FormField>

              <FormField label="Renewal Date">
                {isEditing ? (
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.renewal_date || ''}
                    onChange={e => updateField('renewal_date', e.target.value)}
                  />
                ) : (
                  <p style={valueStyle}>{caseData.renewal_date ? new Date(caseData.renewal_date).toLocaleDateString() : '—'}</p>
                )}
              </FormField>

              <FormField label="Annual Escalation %">
                {isEditing ? (
                  <input
                    type="number"
                    className="form-input"
                    value={editForm.escalation_percent || ''}
                    onChange={e => updateField('escalation_percent', parseFloat(e.target.value))}
                    step="0.1"
                    placeholder="%"
                  />
                ) : (
                  <p style={valueStyle}>{caseData.escalation_percent ? `${caseData.escalation_percent}%` : '—'}</p>
                )}
              </FormField>

              <FormField label="Property Address" fullWidth>
                {isEditing ? (
                  <textarea
                    className="form-input"
                    value={editForm.property_address || ''}
                    onChange={e => updateField('property_address', e.target.value)}
                    rows={2}
                  />
                ) : (
                  <p style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{caseData.property_address || '—'}</p>
                )}
              </FormField>

              <FormField label="Landlord Name">
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editForm.landlord_name || ''}
                    onChange={e => updateField('landlord_name', e.target.value)}
                  />
                ) : (
                  <p style={valueStyle}>{caseData.landlord_name || '—'}</p>
                )}
              </FormField>

              <FormField label="Landlord Contact">
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editForm.landlord_contact || ''}
                    onChange={e => updateField('landlord_contact', e.target.value)}
                  />
                ) : (
                  <p style={valueStyle}>{caseData.landlord_contact || '—'}</p>
                )}
              </FormField>

              <FormField label="Tenant Name">
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editForm.tenant_name || ''}
                    onChange={e => updateField('tenant_name', e.target.value)}
                  />
                ) : (
                  <p style={valueStyle}>{caseData.tenant_name || '—'}</p>
                )}
              </FormField>

              <FormField label="Tenant Contact">
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editForm.tenant_contact || ''}
                    onChange={e => updateField('tenant_contact', e.target.value)}
                  />
                ) : (
                  <p style={valueStyle}>{caseData.tenant_contact || '—'}</p>
                )}
              </FormField>

              <FormField label="Maintenance Terms" fullWidth>
                {isEditing ? (
                  <textarea
                    className="form-input"
                    value={editForm.maintenance_terms || ''}
                    onChange={e => updateField('maintenance_terms', e.target.value)}
                    rows={2}
                    placeholder="Describe maintenance responsibilities"
                  />
                ) : (
                  <p style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{caseData.maintenance_terms || '—'}</p>
                )}
              </FormField>

            </div>
          </div>
        </div>
      )}

      {/* General Case Fields */}
      {caseData.case_type === 'General' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} style={{ color: 'var(--gold)' }} /> General Matter Details
            </h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

              <FormField label="Court / Forum">
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editForm.court_name || ''}
                    onChange={e => updateField('court_name', e.target.value)}
                    placeholder="e.g. High Court of Bombay"
                  />
                ) : (
                  <p style={valueStyle}>{caseData.court_name || '—'}</p>
                )}
              </FormField>

              <FormField label="Next Hearing Date">
                {isEditing ? (
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.next_hearing_date || ''}
                    onChange={e => updateField('next_hearing_date', e.target.value)}
                  />
                ) : (
                  <DeadlineDisplay date={caseData.next_hearing_date} label="Hearing" />
                )}
              </FormField>

              <FormField label="Opposing Party">
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editForm.opposing_party || ''}
                    onChange={e => updateField('opposing_party', e.target.value)}
                  />
                ) : (
                  <p style={valueStyle}>{caseData.opposing_party || '—'}</p>
                )}
              </FormField>

              <FormField label="Case Number / FIR No.">
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editForm.case_number || ''}
                    onChange={e => updateField('case_number', e.target.value)}
                  />
                ) : (
                  <p style={valueStyle}>{caseData.case_number || '—'}</p>
                )}
              </FormField>

              <FormField label="Matter Description" fullWidth>
                {isEditing ? (
                  <textarea
                    className="form-input"
                    value={editForm.matter_description || ''}
                    onChange={e => updateField('matter_description', e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{caseData.matter_description || '—'}</p>
                )}
              </FormField>

            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: '0.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={13} />
          Created: {caseData.created_at ? new Date(caseData.created_at).toLocaleString() : '—'}
        </span>
        {caseData.updated_at && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={13} />
            Updated: {new Date(caseData.updated_at).toLocaleString()}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: caseData.synced ? 'var(--success)' : 'var(--warning)'
          }} />
          {caseData.synced ? 'Synced to Drive' : 'Pending Sync'}
        </span>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Case">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{caseData.title}</strong>?
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Trash2 size={16} />}
            Delete Case
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

const valueStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  margin: 0,
  fontWeight: 500,
};

function FormField({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function DeadlineDisplay({ date, label = 'Deadline' }: { date?: string; label?: string }) {
  if (!date) return <p style={valueStyle}>—</p>;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  const color = days < 0 ? 'var(--danger)' : days <= 7 ? 'var(--danger)' : days <= 30 ? 'var(--warning)' : days <= 60 ? 'var(--gold)' : 'var(--text-primary)';
  return (
    <div>
      <p style={{ ...valueStyle, color }}>{new Date(date).toLocaleDateString()}</p>
      <p style={{ margin: 0, fontSize: '0.8rem', color }}>
        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
      </p>
    </div>
  );
}

function SeverityBadge({ value }: { value?: string }) {
  if (!value) return <p style={valueStyle}>—</p>;
  const colors: Record<string, string> = {
    Low: 'var(--success)',
    Medium: 'var(--warning)',
    High: '#f97316',
    Critical: 'var(--danger)',
  };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 4,
      fontSize: '0.8rem',
      fontWeight: 600,
      background: `${colors[value] || 'var(--text-muted)'}22`,
      color: colors[value] || 'var(--text-muted)',
      border: `1px solid ${colors[value] || 'var(--text-muted)'}`,
    }}>
      {value}
    </span>
  );
}
