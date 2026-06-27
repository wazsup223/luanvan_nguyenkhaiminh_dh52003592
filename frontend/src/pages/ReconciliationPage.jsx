/**
 * ============================================
 * RECONCILIATION PAGE - F15: Äá»‘i soÃ¡t thanh toÃ¡n
 * ============================================
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';

export default function ReconciliationPage() {
  const navigate = useNavigate();
  const [reconciliation, setReconciliation] = useState(null);
  const [details, setDetails] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [marking, setMarking] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recRes, detRes, repRes] = await Promise.all([
        fetch(`${API_BASE}/api/reconciliation`).then(r => r.json()),
        fetch(`${API_BASE}/api/reconciliation/details`).then(r => r.json()),
        fetch(`${API_BASE}/api/reconciliation/report`).then(r => r.json()),
      ]);
      if (recRes.success) setReconciliation(recRes.data);
      if (detRes.success) setDetails(detRes.data);
      if (repRes.success) setReport(repRes.data);
    } catch (err) {
      setError('KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u Ä‘á»‘i soÃ¡t');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReconciled = async (transactionId) => {
    try {
      setMarking(true);
      const res = await fetch(`${API_BASE}/api/reconciliation/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: transactionId })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('ÄÃ£ Ä‘Ã¡nh dáº¥u Ä‘á»‘i soÃ¡t thÃ nh cÃ´ng âœ…');
        await fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Lá»—i Ä‘á»‘i soÃ¡t');
      }
    } catch (err) {
      setError('Lá»—i káº¿t ná»‘i server');
    } finally {
      setMarking(false);
    }
  };

  const handleRecordReconciliation = async () => {
    try {
      setMarking(true);
      const res = await fetch(`${API_BASE}/api/reconciliation/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: 1 })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('ÄÃ£ ghi nháº­n phiÃªn Ä‘á»‘i soÃ¡t thÃ nh cÃ´ng âœ…');
        await fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Lá»—i ghi nháº­n');
      }
    } catch (err) {
      setError('Lá»—i káº¿t ná»‘i server');
    } finally {
      setMarking(false);
    }
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('vi-VN') + 'Ä‘';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const statusColor = (status) => {
    switch (status) {
      case 'reconciled': return 'bg-green-100 text-yellow-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'disputed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'reconciled': return 'âœ… ÄÃ£ Ä‘á»‘i soÃ¡t';
      case 'pending': return 'â³ Chá» Ä‘á»‘i soÃ¡t';
      case 'disputed': return 'âŒ KhÃ¡c biá»‡t';
      default: return status;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - KFC Red */}
      <div className="bg-red-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">ðŸ” Äá»‘i soÃ¡t thanh toÃ¡n</h1>
              <p className="text-red-100 text-sm">Quáº£n lÃ½ giao dá»‹ch vÃ  Ä‘á»‘i soÃ¡t</p>
            </div>
            <button
              onClick={handleRecordReconciliation}
              disabled={marking}
              className="px-5 py-2.5 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition disabled:opacity-50"
            >
              ðŸ“‹ Ghi nháº­n phiÃªn
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {success && <div className="bg-yellow-50 text-yellow-700 p-3 rounded-xl mb-4 font-semibold">{success}</div>}
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 font-semibold">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Tá»•ng giao dá»‹ch</p>
          <p className="text-2xl font-black text-gray-900">{reconciliation?.total_transactions || details.length || 0}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">ÄÃ£ Ä‘á»‘i soÃ¡t</p>
          <p className="text-2xl font-black text-yellow-600">{reconciliation?.reconciled_count || details.filter(d => d.status === 'reconciled').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Chá» Ä‘á»‘i soÃ¡t</p>
          <p className="text-2xl font-black text-yellow-600">{reconciliation?.pending_count || details.filter(d => d.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Tá»•ng tiá»n</p>
          <p className="text-xl font-black text-red-600">{formatCurrency(reconciliation?.total_amount || report?.total_revenue)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'overview', label: 'ðŸ“Š Tá»•ng quan' },
          { id: 'details', label: 'ðŸ“‹ Chi tiáº¿t' },
          { id: 'report', label: 'ðŸ“ˆ BÃ¡o cÃ¡o' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              activeTab === tab.id
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-red-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-lg text-gray-900 mb-4">Tá»•ng quan Ä‘á»‘i soÃ¡t</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue by payment method */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Theo phÆ°Æ¡ng thá»©c thanh toÃ¡n</h3>
              {report?.by_payment_method ? Object.entries(report.by_payment_method).map(([method, data]) => (
                <div key={method} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600 capitalize">{method}</span>
                  <span className="font-bold text-sm text-gray-900">{formatCurrency(data.total || data)}</span>
                </div>
              )) : (
                <p className="text-sm text-gray-400">KhÃ´ng cÃ³ dá»¯ liá»‡u</p>
              )}
            </div>
            {/* Status breakdown */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Theo tráº¡ng thÃ¡i</h3>
              {details.length > 0 ? (
                <>
                  {['reconciled', 'pending', 'disputed'].map(status => {
                    const count = details.filter(d => d.status === status).length;
                    const total = details.filter(d => d.status === status).reduce((s, d) => s + Number(d.amount || 0), 0);
                    return (
                      <div key={status} className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor(status)}`}>
                          {statusLabel(status)}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">{count} GD</span>
                          <span className="text-xs text-gray-400 ml-2">{formatCurrency(total)}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-sm text-gray-400">KhÃ´ng cÃ³ dá»¯ liá»‡u</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">MÃ£ GD</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">ÄÆ¡n hÃ ng</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">PhÆ°Æ¡ng thá»©c</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sá»‘ tiá»n</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tráº¡ng thÃ¡i</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Thá»i gian</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">HÃ nh Ä‘á»™ng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {details.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">
                      ChÆ°a cÃ³ giao dá»‹ch nÃ o
                    </td>
                  </tr>
                ) : (
                  details.map((d, i) => (
                    <tr key={d.transaction_id || i} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">#{d.transaction_id || i + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">#{d.order_id || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{d.payment_method || d.method || '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{formatCurrency(d.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor(d.status)}`}>
                          {statusLabel(d.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{d.created_at ? formatDate(d.created_at) : '-'}</td>
                      <td className="px-4 py-3">
                        {d.status === 'pending' && (
                          <button
                            onClick={() => handleMarkReconciled(d.transaction_id)}
                            disabled={marking}
                            className="px-3 py-1 text-xs font-bold bg-yellow-500 text-white rounded-full hover:bg-red-700 transition disabled:opacity-50"
                          >
                            âœ“ Äá»‘i soÃ¡t
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-4">BÃ¡o cÃ¡o Ä‘á»‘i soÃ¡t</h2>
            {report ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-yellow-50 rounded-xl p-5">
                  <p className="text-sm text-yellow-600 mb-1">Tá»•ng doanh thu</p>
                  <p className="text-2xl font-black text-yellow-700">{formatCurrency(report.total_revenue)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-5">
                  <p className="text-sm text-red-600 mb-1">ÄÃ£ Ä‘á»‘i soÃ¡t</p>
                  <p className="text-2xl font-black text-red-700">{formatCurrency(report.reconciled_amount)}</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-5">
                  <p className="text-sm text-yellow-600 mb-1">ChÃªnh lá»‡ch</p>
                  <p className="text-2xl font-black text-yellow-700">{formatCurrency(report.discrepancy || report.difference)}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">KhÃ´ng cÃ³ dá»¯ liá»‡u bÃ¡o cÃ¡o</p>
            )}
          </div>
        </div>
      )}

      {/* Back button */}
      <div className="mt-8">
        <button
          onClick={() => navigate('/admin')}
          className="px-5 py-2 text-sm font-semibold text-gray-600 hover:text-red-600 transition"
        >
          â† Quay láº¡i Quáº£n trá»‹
        </button>
      </div>
      </div>
    </div>
  );
}
