import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFullDateStr } from '@/lib/levantineMonths';
import { TIME_SLOT_LABELS } from '@/lib/data';

// Draw a rounded rectangle path
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Wrap text to fit within maxWidth, returns array of lines
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const SLOT_CONFIG = {
  lunch:     { label: 'غداء ظهراً',           bg: '#fff4e0', text: '#a05a00', border: '#e8b840' },
  afternoon: { label: 'خطبة / طلبة عصراً',    bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  wedding:   { label: 'حفل زفاف مساءاً',      bg: '#f5f3ff', text: '#5b21b6', border: '#a78bfa' },
  full:      { label: 'اليوم كاملاً',          bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  // legacy
  morning:   { label: 'غداء ظهراً',           bg: '#fff4e0', text: '#a05a00', border: '#e8b840' },
  evening:   { label: 'حفل زفاف مساءاً',      bg: '#f5f3ff', text: '#5b21b6', border: '#a78bfa' },
};

function drawCard(booking) {
  const W = 1080;
  const H = 1620;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // ── Background gradient ──
  const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
  bg.addColorStop(0, '#fdf6ea');
  bg.addColorStop(0.6, '#f5e8d0');
  bg.addColorStop(1, '#ede0c4');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle pattern dots ──
  ctx.fillStyle = 'rgba(200,160,80,0.07)';
  for (let y = 40; y < H; y += 60) {
    for (let x = 40; x < W; x += 60) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Gold top band ──
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, '#b8901a');
  topGrad.addColorStop(0.5, '#e8c060');
  topGrad.addColorStop(1, '#b8901a');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 18);

  // ── Outer border ──
  ctx.strokeStyle = '#c8a050';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  // Inner thin border
  ctx.strokeStyle = 'rgba(200,160,80,0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(46, 46, W - 92, H - 92);

  // ── Header area ──
  const headerY = 80;

  // Corner ornaments (simple geometric)
  const drawOrnament = (cx, cy) => {
    ctx.strokeStyle = '#c8a050';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#c8a050';
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  };
  drawOrnament(80, 100); drawOrnament(W - 80, 100);
  drawOrnament(80, H - 100); drawOrnament(W - 80, H - 100);

  // Subtitle
  ctx.fillStyle = '#a08060';
  ctx.font = 'bold 36px Tahoma, Arial';
  ctx.fillText('نظام حجوزات آل سلهب', W / 2, headerY + 80);

  // Gold divider line with diamond
  const divY1 = headerY + 120;
  const goldLine = ctx.createLinearGradient(120, 0, W - 120, 0);
  goldLine.addColorStop(0, 'transparent');
  goldLine.addColorStop(0.3, '#c8a050');
  goldLine.addColorStop(0.7, '#c8a050');
  goldLine.addColorStop(1, 'transparent');
  ctx.strokeStyle = goldLine;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(120, divY1); ctx.lineTo(W - 120, divY1); ctx.stroke();

  // Main title
  ctx.fillStyle = '#1a2a2a';
  ctx.font = 'bold 88px Tahoma, Arial';
  ctx.fillText('أفراح آل سلهب', W / 2, headerY + 200);

  // Gold underline
  const underGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  underGrad.addColorStop(0, 'transparent');
  underGrad.addColorStop(0.5, '#c8a050');
  underGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = underGrad;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W / 2 - 200, headerY + 240); ctx.lineTo(W / 2 + 200, headerY + 240); ctx.stroke();

  // ── Decorative icon ──
  ctx.font = '90px serif';
  ctx.fillText('🎊', W / 2, headerY + 360);

  // ── Event name ──
  ctx.fillStyle = '#1a2a2a';
  ctx.font = 'bold 72px Tahoma, Arial';
  const nameLines = wrapText(ctx, booking.event_name || '', W - 160);
  const nameStartY = headerY + 490;
  nameLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, nameStartY + i * 88);
  });
  const afterName = nameStartY + nameLines.length * 88 + 20;

  // ── Divider ──
  const div2Grad = ctx.createLinearGradient(200, 0, W - 200, 0);
  div2Grad.addColorStop(0, 'transparent');
  div2Grad.addColorStop(0.5, '#c8a050');
  div2Grad.addColorStop(1, 'transparent');
  ctx.strokeStyle = div2Grad;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(200, afterName); ctx.lineTo(W - 200, afterName); ctx.stroke();

  // ── Date box ──
  const dateBoxY = afterName + 40;
  const dateBoxH = 160;
  roundRect(ctx, 120, dateBoxY, W - 240, dateBoxH, 24);
  ctx.fillStyle = 'rgba(200,160,80,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,160,80,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#8a7060';
  ctx.font = 'bold 32px Tahoma, Arial';
  ctx.fillText('تاريخ المناسبة', W / 2, dateBoxY + 44);

  ctx.fillStyle = '#1a3030';
  ctx.font = 'bold 52px Tahoma, Arial';
  const dateLabel = booking.date ? formatFullDateStr(booking.date) : '';
  ctx.fillText(dateLabel, W / 2, dateBoxY + 112);

  // ── Time slot pill ──
  const slotCfg = SLOT_CONFIG[booking.time_slot] || SLOT_CONFIG.wedding;
  const pillY = dateBoxY + dateBoxH + 50;
  const pillW = 420;
  const pillH = 80;
  const pillX = (W - pillW) / 2;

  roundRect(ctx, pillX, pillY, pillW, pillH, 40);
  ctx.fillStyle = slotCfg.bg;
  ctx.fill();
  ctx.strokeStyle = slotCfg.border;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = slotCfg.text;
  ctx.font = 'bold 38px Tahoma, Arial';
  ctx.fillText('🕐 ' + (TIME_SLOT_LABELS[booking.time_slot] || slotCfg.label), W / 2, pillY + pillH / 2);

  // ── Badges row ──
  let badgeX = W / 2;
  const badgeY = pillY + pillH + 60;
  const badges = [];
  if (booking.book_diwan) badges.push({ label: '🏛️ الديوان ✓', bg: 'linear', text: '#3a2a00' });
  badges.push({ label: '✅ مؤكد', bg: '#e8faf0', border: '#60c08a', text: '#1a6a40' });

  const bW = 300;
  const bH = 72;
  const gap = 30;
  const totalBadgeW = badges.length * bW + (badges.length - 1) * gap;
  let bStartX = (W - totalBadgeW) / 2;

  badges.forEach(b => {
    roundRect(ctx, bStartX, badgeY, bW, bH, 36);
    if (b.bg === 'linear') {
      const g = ctx.createLinearGradient(bStartX, 0, bStartX + bW, 0);
      g.addColorStop(0, '#c8a050');
      g.addColorStop(1, '#e8c870');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = b.bg;
    }
    ctx.fill();
    if (b.border) { ctx.strokeStyle = b.border; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = b.text;
    ctx.font = 'bold 36px Tahoma, Arial';
    ctx.fillText(b.label, bStartX + bW / 2, badgeY + bH / 2);
    bStartX += bW + gap;
  });

  // ── Footer ──
  const footerY = H - 160;
  const footGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
  footGrad.addColorStop(0, 'transparent');
  footGrad.addColorStop(0.3, '#c8a050');
  footGrad.addColorStop(0.7, '#c8a050');
  footGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = footGrad;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(120, footerY); ctx.lineTo(W - 120, footerY); ctx.stroke();

  ctx.fillStyle = '#4a3a20';
  ctx.font = 'bold 40px Tahoma, Arial';
  ctx.fillText('قاعة أفراح آل سلهب', W / 2, footerY + 55);

  // ── Gold bottom band ──
  const botGrad = ctx.createLinearGradient(0, 0, W, 0);
  botGrad.addColorStop(0, '#b8901a');
  botGrad.addColorStop(0.5, '#e8c060');
  botGrad.addColorStop(1, '#b8901a');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 18, W, 18);

  return canvas;
}

export default function EventCardDownload({ booking, size = 'sm' }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
    setLoading(true);
    setTimeout(() => {
      const canvas = drawCard(booking);
      const link = document.createElement('a');
      const safeName = (booking.event_name || 'فعالية').replace(/\s+/g, '-');
      link.download = `${safeName}-${booking.date}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.click();
      setLoading(false);
    }, 20);
  };

  return (
    <Button
      size={size}
      variant="outline"
      onClick={handleDownload}
      disabled={loading}
      className="gap-1.5 font-body shrink-0"
      title="تحميل بطاقة الفعالية"
    >
      <Download size={14} />
      {loading ? '...' : 'بطاقة'}
    </Button>
  );
}