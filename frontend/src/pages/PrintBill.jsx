/**
 * ============================================
 * PRINT BILL PAGE - F11: In hóa đơn
 * ============================================
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const PrintBill = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load bill data
  useEffect(() => {
    const loadBill = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/bills/${orderId}`);
        if (res.data.success) {
          setBill(res.data.data);
        } else {
          setError(res.data.message);
        }
      } catch (error) {
        console.error('Error loading bill:', error);
        setError('Không thể tải hóa đơn');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadBill();
    }
  }, [orderId]);

  // Print function
  const handlePrint = () => {
    const printContent = printRef.current;
    const winPrint = window.open('', '', 'width=400,height=600');
    winPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hóa đơn #${orderId}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              width: 80mm; 
              margin: 0 auto;
              padding: 10px;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .header h1 { font-size: 18px; margin-bottom: 5px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .info p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 3px 0; }
            th { border-bottom: 1px solid #000; }
            .right { text-align: right; }
            .center { text-align: center; }
            .total { font-weight: bold; font-size: 14px; }
            .footer { text-align: center; margin-top: 15px; }
            @media print {
              body { width: 80mm; }
            }
          </style>
        </head>
        <body>
          ${printRef.current?.innerHTML || ''}
        </body>
      </html>
    `);
    winPrint.document.close();
    winPrint.focus();
    winPrint.print();
    winPrint.close();
  };

  // Download as PDF (simple implementation)
  const handleDownload = () => {
    // Open print view for PDF save
    window.open(`/api/bills/${orderId}/print`, '_blank');
  };

  // Send via email
  const handleEmail = async () => {
    const email = prompt('Nhập địa chỉ email để gửi hóa đơn:');
    if (email) {
      try {
        await api.post(`/bills/${orderId}/email`, { email });
        alert('Đã gửi hóa đơn đến email!');
      } catch (error) {
        alert('Lỗi gửi email');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px' }}>⏳ Đang tải hóa đơn...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', color: '#e74c3c' }}>❌ {error}</div>
        <button onClick={() => navigate(-1)} style={{ marginTop: '20px', padding: '10px 20px' }}>
          ← Quay lại
        </button>
      </div>
    );
  }

  if (!bill) return null;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Actions Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={handlePrint} style={btnStyle('#27ae60')}>
          🖨️ In hóa đơn
        </button>
        <button onClick={handleDownload} style={btnStyle('#3498db')}>
          📄 Mở trang in
        </button>
        <button onClick={handleEmail} style={btnStyle('#9b59b6')}>
          📧 Gửi email
        </button>
        <button onClick={() => navigate(-1)} style={btnStyle('#666')}>
          ← Quay lại
        </button>
      </div>

      {/* Bill Content - Ref for printing */}
      <div ref={printRef} style={billStyle}>
        {/* Header */}
        <div className="header">
          <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>🍔 FASTFOD</h1>
          <div style={{ fontSize: '11px', color: '#666' }}>
            <p>{bill.branch?.branch_name}</p>
            <p>{bill.branch?.address}</p>
            <p>ĐT: {bill.branch?.phone}</p>
          </div>
        </div>

        <div className="divider" />

        {/* Invoice Info */}
        <div className="info">
          <p><strong>Mã hóa đơn:</strong> #{bill.order_id}</p>
          <p><strong>Ngày:</strong> {new Date(bill.order_date).toLocaleString('vi-VN')}</p>
          <p><strong>Loại:</strong> {
            bill.order_type === 'dine_in' ? 'Tại bàn' :
            bill.order_type === 'takeaway' ? 'Mang về' : 'Giao hàng'
          }</p>
          {bill.table && <p><strong>Bàn:</strong> {bill.table.number}</p>}
          {bill.customer?.name && <p><strong>Khách hàng:</strong> {bill.customer.name}</p>}
          {bill.customer?.phone && <p><strong>Điện thoại:</strong> {bill.customer.phone}</p>}
        </div>

        <div className="divider" />

        {/* Items Table */}
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tên món</th>
              <th className="right">SL</th>
              <th className="right">Đ.Giá</th>
              <th className="right">T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            {bill.items?.map((item, index) => (
              <tr key={index}>
                <td className="center">{index + 1}</td>
                <td>
                  {item.name}
                  {item.notes && <div style={{ fontSize: '10px', color: '#888' }}>  └ {item.notes}</div>}
                </td>
                <td className="right">{item.quantity}</td>
                <td className="right">{formatCurrency(item.unit_price)}</td>
                <td className="right">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="divider" />

        {/* Totals */}
        <table style={{ marginTop: '10px' }}>
          <tbody>
            <tr>
              <td>Tạm tính:</td>
              <td className="right">{formatCurrency(bill.subtotal)}</td>
            </tr>
            {bill.discount_amount > 0 && (
              <tr>
                <td>Giảm giá:</td>
                <td className="right" style={{ color: '#e74c3c' }}>-{formatCurrency(bill.discount_amount)}</td>
              </tr>
            )}
            {bill.tax_amount > 0 && (
              <tr>
                <td>Thuế (10%):</td>
                <td className="right">{formatCurrency(bill.tax_amount)}</td>
              </tr>
            )}
            <tr style={{ fontSize: '16px', fontWeight: 'bold' }}>
              <td style={{ paddingTop: '10px' }}>TỔNG CỘNG:</td>
              <td className="right" style={{ paddingTop: '10px' }}>{formatCurrency(bill.final_amount)}</td>
            </tr>
          </tbody>
        </table>

        {/* Payment Info */}
        {bill.payment?.method && (
          <>
            <div className="divider" />
            <div>
              <p><strong>Thanh toán:</strong> {
                bill.payment.method === 'cash' ? 'Tiền mặt' :
                bill.payment.method === 'momo' ? 'MoMo' :
                bill.payment.method === 'zalopay' ? 'ZaloPay' : 'VNPay'
              }</p>
              <p><strong>Trạng thái:</strong> {bill.payment.status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}</p>
            </div>
          </>
        )}

        {/* Promotions */}
        {bill.promotions_applied?.length > 0 && (
          <>
            <div className="divider" />
            <div style={{ fontSize: '11px' }}>
              <p>Khuyến mãi đã áp dụng:</p>
              {bill.promotions_applied.map((p, i) => (
                <p key={i}>• {p.name} (-{formatCurrency(p.discount_applied)})</p>
              ))}
            </div>
          </>
        )}

        {/* Notes */}
        {bill.notes && (
          <>
            <div className="divider" />
            <div style={{ fontSize: '11px' }}>
              <p><strong>Ghi chú:</strong> {bill.notes}</p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="footer" style={{ marginTop: '20px' }}>
          <div className="divider" />
          <p style={{ marginTop: '10px', fontSize: '13px' }}>✨ Cảm ơn quý khách! ✨</p>
          <p style={{ fontSize: '11px', color: '#888' }}>Hẹn gặp lại!</p>
        </div>
      </div>

      {/* Hidden print styles */}
      <style>{`
        @media print {
          .actions { display: none !important; }
        }
      `}</style>
    </div>
  );
};

// Helper functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
};

const btnStyle = (bg) => ({
  padding: '10px 16px',
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px'
});

const billStyle = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: '12px',
  padding: '20px',
  fontFamily: "'Courier New', monospace",
  fontSize: '12px'
};

export default PrintBill;
