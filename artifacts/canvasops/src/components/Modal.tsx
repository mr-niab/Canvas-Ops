import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!isOpen && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog 
      ref={dialogRef}
      onClose={onClose}
      style={{
        padding: 0,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface)',
        width: '400px',
        maxWidth: '90vw',
        boxShadow: 'var(--shadow)',
        color: 'var(--text)',
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div style={{ padding: '20px', display: 'grid', gap: '16px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontFamily: '"Cabinet Grotesk", sans-serif' }}>{title}</h2>
          <button className="btn" style={{ padding: '4px 8px' }} onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
