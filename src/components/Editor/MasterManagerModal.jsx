import React from 'react';
import { Plus, Trash2, Briefcase } from 'lucide-react';
import { generateId } from '../../utils.js';
import { Modal } from '../ui/Modal.jsx';
import { FormField } from '../ui/FormField.jsx';

export const MasterManagerModal = ({ isOpen, onClose, contractors, setContractors }) => {
  const addContractor = () => setContractors([...contractors, { id: generateId(), address: '', tradeName: '', representative: '' }]);
  const updateContractor = (id, field, val) => setContractors(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  const deleteContractor = (id) => setContractors(prev => prev.filter(c => c.id !== id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="工事人マスタ管理" maxWidth="max-w-4xl" footer={<button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">閉じる</button>}>
      <div className="flex flex-col gap-4 text-black">
        <div className="min-h-[400px]">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 font-bold">工事完了引渡証明書等に使用する工事会社を登録します。</p>
              <button onClick={addContractor} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-all"><Plus size={14} /> 新規登録</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {contractors.map(c => (
                <div key={c.id} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex items-start gap-4 hover:border-blue-200 transition-colors">
                  <div className="flex-1 grid grid-cols-1 gap-3">
                    <FormField label="住所" value={c.address} onChange={v => updateContractor(c.id, 'address', v)} />
                    <div className="flex gap-3">
                      <FormField label="商号又は名称" value={c.tradeName} onChange={v => updateContractor(c.id, 'tradeName', v)} />
                      <FormField label="代表者" value={c.representative} onChange={v => updateContractor(c.id, 'representative', v)} />
                    </div>
                  </div>
                  <button onClick={() => deleteContractor(c.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={18} /></button>
                </div>
              ))}
              {contractors.length === 0 && <div className="text-center py-12 text-gray-400 italic">工事会社が登録されていません</div>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
