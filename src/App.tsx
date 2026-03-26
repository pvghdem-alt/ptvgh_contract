import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp, 
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  DollarSign, 
  User as UserIcon, 
  Bell, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Search,
  Send,
  History,
  Check,
  FileDown
} from "lucide-react";
import { format, addMonths, subMonths, isBefore, isAfter, intervalToDuration } from "date-fns";
import { Toaster, toast } from "sonner";
import { cn } from "./lib/utils";
import pptxgen from "pptxgenjs";

// --- Types ---

interface Contract {
  id: string;
  name: string;
  amount: number;
  startDate: Timestamp;
  endDate: Timestamp;
  contactPerson: string;
  contactEmail: string;
  campus: string;
  notified?: boolean;
  completed?: boolean;
}

// --- Components ---

const ContractModal = ({ 
  contract, 
  onClose, 
  onSave 
}: { 
  contract?: Partial<Contract>, 
  onClose: () => void, 
  onSave: (data: any) => void 
}) => {
  const [formData, setFormData] = useState({
    name: contract?.name || "",
    amount: contract?.amount || 0,
    startDate: contract?.startDate ? format(contract.startDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    endDate: contract?.endDate ? format(contract.endDate.toDate(), "yyyy-MM-dd") : format(addMonths(new Date(), 12), "yyyy-MM-dd"),
    contactPerson: contract?.contactPerson || "",
    contactEmail: contract?.contactEmail || "",
    campus: contract?.campus || "總院",
  });

  const tenderStartDate = useMemo(() => {
    try {
      const end = new Date(formData.endDate);
      const amount = Number(formData.amount);
      const thresholdMonths = amount > 10000000 ? 7 : 4;
      return format(subMonths(end, thresholdMonths), "yyyy-MM-dd");
    } catch (e) {
      return "日期錯誤";
    }
  }, [formData.endDate, formData.amount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contactPerson || !formData.contactEmail || !formData.campus) {
      toast.error("請填寫所有必填欄位");
      return;
    }
    onSave({
      ...formData,
      amount: Number(formData.amount),
      startDate: Timestamp.fromDate(new Date(formData.startDate)),
      endDate: Timestamp.fromDate(new Date(formData.endDate)),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <h2 className="text-2xl font-serif font-light mb-6 text-blue-900">
            {contract?.id ? "編輯契約" : "新增契約"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#1a1a1a]/50 font-semibold mb-1.5 ml-1 text-blue-900/60">院區</label>
              <select
                value={formData.campus}
                onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                className="w-full px-5 py-3.5 bg-sky-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-700 transition-all appearance-none"
              >
                <option value="總院">總院</option>
                <option value="龍泉">龍泉</option>
                <option value="兩院區">兩院區</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#1a1a1a]/50 font-semibold mb-1.5 ml-1 text-blue-900/60">契約名稱</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-5 py-3.5 bg-sky-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-700 transition-all"
                placeholder="請輸入契約名稱"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#1a1a1a]/50 font-semibold mb-1.5 ml-1 text-blue-900/60">契約金額 (TWD)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-5 py-3.5 bg-sky-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-700 transition-all"
                placeholder="請輸入金額"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#1a1a1a]/50 font-semibold mb-1.5 ml-1 text-blue-900/60">起日</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-5 py-3.5 bg-sky-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-700 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#1a1a1a]/50 font-semibold mb-1.5 ml-1 text-blue-900/60">迄日</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-5 py-3.5 bg-sky-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-700 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#1a1a1a]/50 font-semibold mb-1.5 ml-1 text-blue-900/60">預計招標開始日 (系統自動計算)</label>
              <div className="w-full px-5 py-3.5 bg-blue-700/5 rounded-2xl text-blue-700 font-medium flex items-center gap-2 border border-blue-700/10">
                <Clock size={14} />
                {tenderStartDate}
                <span className="text-[10px] opacity-60 ml-auto">
                  {Number(formData.amount) > 10000000 ? "提前 7 個月" : "提前 4 個月"}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#1a1a1a]/50 font-semibold mb-1.5 ml-1 text-blue-900/60">承辦人</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-5 py-3.5 bg-sky-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-700 transition-all"
                placeholder="請輸入姓名"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#1a1a1a]/50 font-semibold mb-1.5 ml-1 text-blue-900/60">承辦人信箱</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-5 py-3.5 bg-sky-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-700 transition-all"
                placeholder="example@hospital.com"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 rounded-full border border-black text-blue-700 hover:bg-sky-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 rounded-full bg-blue-700 text-white hover:bg-blue-800 transition-all font-medium shadow-lg shadow-blue-700/20"
              >
                儲存
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "history">("list");

  // --- Firestore Data ---
  useEffect(() => {
    const q = query(
      collection(db, "contracts"),
      orderBy("endDate", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Contract[];
      setContracts(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      toast.error("無法讀取資料");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Notification Logic ---
  useEffect(() => {
    if (contracts.length === 0) return;

    const checkNotifications = async () => {
      const now = new Date();
      
      for (const contract of contracts) {
        if (contract.notified) continue;

        const endDate = contract.endDate.toDate();
        const amount = contract.amount;
        
        // 10M threshold
        const thresholdMonths = amount > 10000000 ? 7 : 4;
        const notificationDate = subMonths(endDate, thresholdMonths);

        // If today is on or after the notification date
        if (isAfter(now, notificationDate) || format(now, "yyyy-MM-dd") === format(notificationDate, "yyyy-MM-dd")) {
          try {
            // Trigger email via backend
            const response = await fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: contract.contactEmail,
                subject: `【提醒】契約辦理招標通知：${contract.name}`,
                text: `
                  您好，${contract.contactPerson}：
                  
                  提醒您，契約「${contract.name}」即將到期。
                  
                  契約金額：TWD ${contract.amount.toLocaleString()}
                  契約迄日：${format(endDate, "yyyy-MM-dd")}
                  
                  依照規範，契約金額${amount > 10000000 ? "超過" : "未達"}一千萬，應於到期前${thresholdMonths}個月辦理招標。
                  請儘速辦理相關手續。
                  
                  系統自動發送，請勿直接回覆。
                `,
              }),
            });

            const result = await response.json();

            if (response.ok) {
              // Mark as notified in Firestore
              await updateDoc(doc(db, "contracts", contract.id), {
                notified: true
              });
              toast.success(`已發送提醒信件給 ${contract.contactPerson}`);
            } else {
              console.error("Automatic email failed:", result.error);
              toast.error(`自動提醒發送失敗: ${result.error || "未知錯誤"}`);
            }
          } catch (err) {
            console.error("Email trigger failed:", err);
          }
        }
      }
    };

    checkNotifications();
  }, [contracts]);

  // --- Actions ---
  const handleSave = async (data: any) => {
    try {
      if (editingContract?.id) {
        await updateDoc(doc(db, "contracts", editingContract.id), data);
        toast.success("契約已更新");
      } else {
        await addDoc(collection(db, "contracts"), {
          ...data,
          notified: false,
        });
        toast.success("契約已新增");
      }
      setIsModalOpen(false);
      setEditingContract(undefined);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("儲存失敗");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("確定要刪除此契約嗎？")) return;
    try {
      await deleteDoc(doc(db, "contracts", id));
      toast.success("契約已刪除");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("刪除失敗");
    }
  };

  const handleComplete = async (contract: Contract) => {
    try {
      await updateDoc(doc(db, "contracts", contract.id), {
        completed: !contract.completed
      });
      toast.success(contract.completed ? "已取消完成狀態" : "已標記為招標完成");
    } catch (error) {
      toast.error("更新狀態失敗");
    }
  };

  const handleManualNotify = async (contract: Contract) => {
    const now = new Date();
    const endDate = contract.endDate.toDate();
    
    if (isBefore(endDate, now)) {
      toast.error("此契約已到期");
      return;
    }

    const duration = intervalToDuration({ start: now, end: endDate });
    const timeLeftStr = `${duration.years ? duration.years + "年" : ""}${duration.months ? duration.months + "月" : ""}${duration.days ? duration.days + "天" : ""}`;

    const loadingToast = toast.loading("正在寄送通知...");

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: contract.contactEmail,
          subject: `【即時通知】契約剩餘時間提醒：${contract.name}`,
          text: `
            您好，${contract.contactPerson}：
            
            這是關於契約「${contract.name}」的即時剩餘時間通知。
            
            契約迄日：${format(endDate, "yyyy-MM-dd")}
            目前距離到期還剩：${timeLeftStr || "不到一天"}
            
            系統自動發送，請勿直接回覆。
          `,
        }),
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (response.ok) {
        toast.success(`已成功寄送剩餘時間通知給 ${contract.contactPerson}`);
      } else {
        toast.error(result.error || "寄送失敗");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error("Manual notify failed:", err);
      toast.error("寄送失敗");
    }
  };

  const generatePPTReport = () => {
    const pptx = new pptxgen();
    const now = new Date();
    
    // --- Slide 1: Expiring Soon ---
    const slide1 = pptx.addSlide();

    // Title
    slide1.addText("醫院採購契約履行管制 報表 (即將到期)", {
      x: 0.5, y: 0.5, w: "90%", h: 0.8,
      fontSize: 24, bold: true, color: "1e3a8a", align: "center"
    });

    // Date
    slide1.addText(`報表產出日期: ${format(now, "yyyy-MM-dd HH:mm")}`, {
      x: 0.5, y: 1.1, w: "90%", h: 0.4,
      fontSize: 10, color: "64748b", align: "right"
    });

    // Stats Section
    const totalCount = contracts.length;
    const uncompletedCount = contracts.filter(c => !c.completed).length;
    const completedCount = contracts.filter(c => c.completed).length;
    
    slide1.addText(`總採購案數量: ${totalCount} 件`, { x: 0.5, y: 1.6, w: 3, h: 0.5, fontSize: 14, bold: true });
    slide1.addText(`已完成: ${completedCount} 件`, { x: 3.5, y: 1.6, w: 3, h: 0.5, fontSize: 14, color: "10b981" });
    slide1.addText(`未完成: ${uncompletedCount} 件`, { x: 6.5, y: 1.6, w: 3, h: 0.5, fontSize: 14, color: "ef4444" });

    // Expiring Cases (Red)
    const expiringContracts = contracts
      .filter(c => {
        if (c.completed) return false;
        const thresholdMonths = c.amount > 10000000 ? 7 : 4;
        const notificationDate = subMonths(c.endDate.toDate(), thresholdMonths);
        return isAfter(now, notificationDate) || format(now, "yyyy-MM-dd") === format(notificationDate, "yyyy-MM-dd");
      })
      .sort((a, b) => a.contactPerson.localeCompare(b.contactPerson, "zh-Hant"));

    slide1.addText("即將到期/應辦理案件 (未完成):", { x: 0.5, y: 2.2, w: 9, h: 0.4, fontSize: 14, bold: true, color: "b91c1c" });
    
    const expiringRows = expiringContracts.length > 0 
      ? expiringContracts.slice(0, 8).map(c => [
          { text: c.campus },
          { text: c.name },
          { text: c.contactPerson },
          { text: format(c.endDate.toDate(), "yyyy-MM-dd") }
        ])
      : [[{ text: "目前無即將到期案件", options: { colspan: 4, italic: true, align: "center" } }]];
    
    slide1.addTable([
      [
        { text: "院區", options: { fill: { color: "fee2e2" }, bold: true } },
        { text: "契約名稱", options: { fill: { color: "fee2e2" }, bold: true } },
        { text: "承辦人", options: { fill: { color: "fee2e2" }, bold: true } },
        { text: "到期日", options: { fill: { color: "fee2e2" }, bold: true } }
      ],
      ...expiringRows
    ], {
      x: 0.5, y: 2.7, w: 9,
      fontSize: 10,
      border: { type: "solid", color: "000000", pt: 1 },
      fill: { color: "f8fafc" }
    });

    // --- Slide 2: Monitoring ---
    const slide2 = pptx.addSlide();

    slide2.addText("醫院採購契約履行管制 報表 (監控中)", {
      x: 0.5, y: 0.5, w: "90%", h: 0.8,
      fontSize: 24, bold: true, color: "1e3a8a", align: "center"
    });

    // Monitoring Cases (Orange)
    const monitoringContracts = contracts
      .filter(c => {
        if (c.completed) return false;
        const thresholdMonths = c.amount > 10000000 ? 7 : 4;
        const endDate = c.endDate.toDate();
        const notificationDate = subMonths(endDate, thresholdMonths);
        
        const isRed = isAfter(now, notificationDate) || format(now, "yyyy-MM-dd") === format(notificationDate, "yyyy-MM-dd");
        const isOrange = !isRed && isAfter(now, subMonths(notificationDate, 3));
        return isOrange;
      })
      .sort((a, b) => a.contactPerson.localeCompare(b.contactPerson, "zh-Hant"));

    slide2.addText("監控中案件 (未完成):", { x: 0.5, y: 1.5, w: 9, h: 0.4, fontSize: 14, bold: true, color: "ea580c" });
    
    const monitoringRows = monitoringContracts.length > 0
      ? monitoringContracts.slice(0, 8).map(c => [
          { text: c.campus },
          { text: c.name },
          { text: c.contactPerson },
          { text: format(c.endDate.toDate(), "yyyy-MM-dd") }
        ])
      : [[{ text: "目前無監控中案件", options: { colspan: 4, italic: true, align: "center" } }]];
    
    slide2.addTable([
      [
        { text: "院區", options: { fill: { color: "ffedd5" }, bold: true } },
        { text: "契約名稱", options: { fill: { color: "ffedd5" }, bold: true } },
        { text: "承辦人", options: { fill: { color: "ffedd5" }, bold: true } },
        { text: "到期日", options: { fill: { color: "ffedd5" }, bold: true } }
      ],
      ...monitoringRows
    ], {
      x: 0.5, y: 2.0, w: 9,
      fontSize: 10,
      border: { type: "solid", color: "000000", pt: 1 },
      fill: { color: "f8fafc" }
    });

    // Unfinished by Person
    const unfinishedByPerson = contracts.filter(c => !c.completed).reduce((acc, c) => {
      acc[c.contactPerson] = (acc[c.contactPerson] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    slide2.addText("各承辦人未完成案件統計:", { x: 0.5, y: 5.0, w: 9, h: 0.4, fontSize: 14, bold: true, color: "1e3a8a" });
    
    const personRows = Object.entries(unfinishedByPerson).map(([person, count]) => [
      { text: person },
      { text: `${count} 件` }
    ]);
    if (personRows.length > 0) {
      slide2.addTable([
        [
          { text: "承辦人", options: { fill: { color: "e0f2fe" }, bold: true } },
          { text: "未完成數量", options: { fill: { color: "e0f2fe" }, bold: true } }
        ],
        ...personRows.slice(0, 5)
      ], {
        x: 0.5, y: 5.5, w: 4,
        fontSize: 10,
        border: { type: "solid", color: "000000", pt: 1 },
        fill: { color: "f8fafc" }
      });
    }

    pptx.writeFile({ fileName: `醫院契約履行管制報表_${format(new Date(), "yyyyMMdd")}.pptx` });
    toast.success("報表產出成功！");
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contracts, searchTerm]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-sky-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 bg-blue-700/20 rounded-full mb-4"></div>
        <div className="h-4 w-24 bg-blue-700/10 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sky-50 text-[#1a1a1a] font-sans relative overflow-hidden">
      {/* Construction Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1541888946425-d81bb19480c5?q=80&w=2070&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      ></div>

      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-black px-8 py-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-700/20">
            <Calendar className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-blue-900">醫院契約履行管制系統</h1>
            <p className="text-[10px] uppercase tracking-widest text-blue-700/40 font-bold">Contract Management v1.1</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab("list")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "list" ? "bg-white text-blue-700 shadow-sm" : "text-blue-900/40 hover:text-blue-900"
            )}
          >
            <Calendar size={16} />
            契約列表
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "history" ? "bg-white text-blue-700 shadow-sm" : "text-blue-900/40 hover:text-blue-900"
            )}
          >
            <History size={16} />
            通知紀錄
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10 relative z-10">
        {activeTab === "list" ? (
          <>
            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-900/30" size={18} />
                <input 
                  type="text" 
                  placeholder="搜尋契約名稱或承辦人..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-3.5 bg-white/80 backdrop-blur-sm rounded-full border border-black focus:ring-2 focus:ring-blue-700 transition-all shadow-sm"
                />
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={generatePPTReport}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-blue-700 rounded-full border border-black hover:bg-blue-50 transition-all shadow-sm font-medium"
                >
                  <FileDown size={20} />
                  產出報表
                </button>
                <button 
                  onClick={() => {
                    setEditingContract(undefined);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20 font-medium"
                >
                  <Plus size={20} />
                  新增契約
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
              {[
                { label: "總契約數", value: contracts.length, icon: Calendar, color: "bg-blue-50 text-blue-600" },
                { label: "高額契約 (>10M)", value: contracts.filter(c => c.amount > 10000000).length, icon: DollarSign, color: "bg-cyan-50 text-cyan-600" },
                { label: "一般契約 (≤10M)", value: contracts.filter(c => c.amount <= 10000000).length, icon: DollarSign, color: "bg-sky-50 text-sky-600" },
                { label: "已發送提醒", value: contracts.filter(c => c.notified).length, icon: Bell, color: "bg-emerald-50 text-emerald-600" },
                { label: "已招標完成", value: contracts.filter(c => c.completed).length, icon: CheckCircle, color: "bg-green-50 text-green-600" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm p-6 rounded-[24px] shadow-sm border border-black flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.color)}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-base uppercase tracking-widest text-blue-900/60 font-bold">{stat.label}</p>
                    <p className="text-2xl font-serif text-blue-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contract List */}
            <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-black overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">院區</th>
                      <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">契約資訊</th>
                      <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">金額</th>
                      <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">起訖日期</th>
                      <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">招標開始日</th>
                      <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">承辦人</th>
                      <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">狀態</th>
                      <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {filteredContracts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-8 py-20 text-center text-blue-900/30">
                          <div className="flex flex-col items-center">
                            <Calendar size={48} className="mb-4 opacity-20" />
                            <p>尚無契約資料</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                  filteredContracts.map((contract) => {
                    const endDate = contract.endDate.toDate();
                    const amount = contract.amount;
                    const thresholdMonths = amount > 10000000 ? 7 : 4;
                    const notificationDate = subMonths(endDate, thresholdMonths);
                    const now = new Date();
                    
                    // Status logic
                    const isRed = isAfter(now, notificationDate) || format(now, "yyyy-MM-dd") === format(notificationDate, "yyyy-MM-dd");
                    const isOrange = !isRed && isAfter(now, subMonths(notificationDate, 3));

                    return (
                      <tr key={contract.id} className="hover:bg-sky-50 transition-colors group">
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            contract.campus === "總院" ? "bg-blue-50 text-blue-700" :
                            contract.campus === "龍泉" ? "bg-emerald-50 text-emerald-700" :
                            "bg-purple-50 text-purple-700"
                          )}>
                            {contract.campus}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-serif text-lg text-[#1a1a1a] group-hover:text-blue-700 transition-colors">{contract.name}</p>
                          <p className="text-[10px] text-[#1a1a1a]/40 mt-1 uppercase tracking-tighter">ID: {contract.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#1a1a1a]/40 text-xs">$</span>
                            <span className="font-mono font-medium text-[#1a1a1a]">
                              {contract.amount.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs text-[#1a1a1a]/60">
                              <span className="w-4 h-4 rounded bg-green-50 text-green-600 flex items-center justify-center text-[8px] font-bold">S</span>
                              {format(contract.startDate.toDate(), "yyyy-MM-dd")}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <span className="w-4 h-4 rounded bg-red-50 text-red-600 flex items-center justify-center text-[8px] font-bold">E</span>
                              {format(contract.endDate.toDate(), "yyyy-MM-dd")}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                            <Clock size={14} className="opacity-50" />
                            {format(notificationDate, "yyyy-MM-dd")}
                          </div>
                          <p className="text-[10px] text-[#1a1a1a]/40 mt-1 uppercase tracking-tighter">
                            {amount > 10000000 ? "金額 > 10M (提前7個月)" : "金額 ≤ 10M (提前4個月)"}
                          </p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-sky-50 rounded-full flex items-center justify-center text-blue-700">
                              <UserIcon size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{contract.contactPerson}</p>
                              <p className="text-xs text-[#1a1a1a]/40">{contract.contactEmail}</p>
                            </div>
                          </div>
                        </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-4 h-4 rounded-full border border-black/5 shadow-sm",
                                  contract.completed ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" :
                                  contract.notified ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" :
                                  isRed ? "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
                                  isOrange ? "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" :
                                  "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.3)]"
                                )} />
                                <span className={cn(
                                  "text-base font-bold tracking-wider",
                                  contract.completed ? "text-green-600" :
                                  contract.notified ? "text-amber-600" :
                                  isRed ? "text-red-600" :
                                  isOrange ? "text-yellow-600" :
                                  "text-blue-600"
                                )}>
                                  {contract.completed ? "已招標完成" :
                                   contract.notified ? "已通知" :
                                   isRed ? "應辦理" :
                                   isOrange ? "準備中" :
                                   "監控中"}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleComplete(contract)}
                                  className={cn(
                                    "p-2 rounded-lg transition-all",
                                    contract.completed ? "text-green-600 bg-green-50" : "text-[#1a1a1a]/40 hover:text-green-600 hover:bg-green-50"
                                  )}
                                  title={contract.completed ? "取消完成" : "標記為招標完成"}
                                >
                                  <Check size={18} />
                                </button>
                                <button 
                                  onClick={() => handleManualNotify(contract)}
                                  className="p-2 text-[#1a1a1a]/40 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                  title="立刻寄送通知"
                                >
                                  <Send size={18} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingContract(contract);
                                    setIsModalOpen(true);
                                  }}
                                  className="p-2 text-[#1a1a1a]/40 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                                  title="編輯"
                                >
                                  <Edit size={18} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(contract.id)}
                                  className="p-2 text-[#1a1a1a]/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  title="刪除"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                      </tr>
                    );
                  })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-black overflow-hidden">
            <div className="p-8 border-b border-black">
              <h2 className="text-xl font-serif text-blue-900">通知紀錄</h2>
              <p className="text-sm text-blue-900/40 mt-1">目前已寄送通知郵件的承辦人列表</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">院區</th>
                    <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">承辦人</th>
                    <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">契約名稱</th>
                    <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">通知狀態</th>
                    <th className="px-8 py-5 text-base uppercase tracking-widest text-blue-900/60 font-bold">最後通知日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {contracts.filter(c => c.notified).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-blue-900/30">
                        <div className="flex flex-col items-center">
                          <Bell size={48} className="mb-4 opacity-20" />
                          <p>尚無通知紀錄</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    contracts.filter(c => c.notified).map((contract) => (
                      <tr key={contract.id} className="hover:bg-sky-50 transition-colors">
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            contract.campus === "總院" ? "bg-blue-50 text-blue-700" :
                            contract.campus === "龍泉" ? "bg-emerald-50 text-emerald-700" :
                            "bg-purple-50 text-purple-700"
                          )}>
                            {contract.campus}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-700">
                              <UserIcon size={18} />
                            </div>
                            <div>
                              <p className="font-medium text-[#1a1a1a]">{contract.contactPerson}</p>
                              <p className="text-xs text-[#1a1a1a]/40">{contract.contactEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm text-[#1a1a1a]">{contract.name}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <Send size={12} />
                            已發送通知
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm text-[#1a1a1a]/60">系統已自動排程發送</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {isModalOpen && (
        <ContractModal 
          contract={editingContract}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
