import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp, addDoc, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminInventory() {
    const [allDrops, setAllDrops] = useState([]);
    const [currentDropId, setCurrentDropId] = useState(null); // Tracks if we are editing an existing drop
    const [dropName, setDropName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [items, setItems] = useState([{ brand: '', name: '', qty: 0, price: 0 }]);
    const [netProfit, setNetProfit] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // 1. Fetch all drops so you can see your history
    const fetchDrops = async () => {
        const q = query(collection(db, "inventory_drops"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllDrops(docs);
    };

    useEffect(() => { fetchDrops(); }, []);

    // 2. Load a specific drop when clicked from the list
    const loadDrop = (drop) => {
        setCurrentDropId(drop.id);
        setDropName(drop.dropName || '');
        setItems(drop.items || [{ brand: '', name: '', qty: 0, price: 0 }]);
        setNetProfit(null); // Reset profit so you can recalculate for this specific drop
        if (drop.startDate) setStartDate(drop.startDate.toDate().toISOString().split('T')[0]);
        if (drop.endDate) setEndDate(drop.endDate.toDate().toISOString().split('T')[0]);
    };

    const startNewDrop = () => {
        setCurrentDropId(null);
        setDropName('');
        setItems([{ brand: '', name: '', qty: 0, price: 0 }]);
        setStartDate('');
        setEndDate('');
        setNetProfit(null);
    };

    // 3. The Net Profit Logic
    const calculateNetProfit = async () => {
        if (!startDate || !endDate) return alert("Please select the date range for this drop.");
        setIsLoading(true);
        
        try {
            const startD = new Date(startDate + "T00:00:00");
            const endD = new Date(endDate + "T23:59:59");
            const totalInventoryCost = items.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);

            // Pull delivered orders from your orders collection
            const q = query(
                collection(db, "orders"), 
                where("createdAt", ">=", Timestamp.fromDate(startD)),
                where("createdAt", "<=", Timestamp.fromDate(endD)),
                where("status", "==", "Delivered")
            );

            const querySnapshot = await getDocs(q);
            let totalRevenue = 0;
            querySnapshot.forEach((doc) => {
                totalRevenue += Number(doc.data().total || 0);
            });

            setNetProfit(totalRevenue - totalInventoryCost);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveOrUpdate = async () => {
        if (!dropName) return alert("Name your drop first!");
        const totalSpent = items.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);
        
        const data = {
            dropName,
            startDate: startDate ? Timestamp.fromDate(new Date(startDate + "T00:00:00")) : null,
            endDate: endDate ? Timestamp.fromDate(new Date(endDate + "T23:59:59")) : null,
            items,
            totalInvestment: totalSpent,
            updatedAt: Timestamp.now()
        };

        if (currentDropId) {
            await updateDoc(doc(db, "inventory_drops", currentDropId), data);
            alert("Drop updated!");
        } else {
            await addDoc(collection(db, "inventory_drops"), { ...data, createdAt: Timestamp.now() });
            alert("New drop saved!");
        }
        fetchDrops();
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-4">
            {/* Sidebar: Your History */}
            <div className="w-full lg:w-1/4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Saved Drops</h3>
                <button onClick={startNewDrop} className="w-full mb-4 p-3 bg-[#1C3C85] text-white rounded-xl font-bold text-xs">+ NEW DROP</button>
                <div className="space-y-2">
                    {allDrops.map(d => (
                        <div 
                            key={d.id} 
                            onClick={() => loadDrop(d)}
                            className={`p-3 rounded-xl cursor-pointer border transition-all ${currentDropId === d.id ? 'bg-white border-[#1C3C85] shadow-sm' : 'bg-transparent border-transparent hover:bg-white'}`}
                        >
                            <p className="font-bold text-sm text-gray-800">{d.dropName}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">{d.totalInvestment?.toLocaleString()} EGP Spent</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Form */}
            <div className="flex-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-[#1C3C85] uppercase italic">{currentDropId ? 'Editing Drop' : 'New Drop Analysis'}</h2>
                    <button onClick={handleSaveOrUpdate} className="bg-green-600 text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest">
                        {currentDropId ? 'Update Record' : 'Save New Drop'}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <input className="p-3 border rounded-xl bg-gray-50 outline-none font-bold" placeholder="Drop Name" value={dropName} onChange={(e) => setDropName(e.target.value)} />
                    <div className="flex gap-2">
                        <input type="date" className="p-3 border rounded-xl bg-gray-50 w-full text-xs font-bold" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        <input type="date" className="p-3 border rounded-xl bg-gray-50 w-full text-xs font-bold" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>

                <table className="w-full mb-4">
                    <thead className="text-[10px] text-gray-400 uppercase font-black">
                        <tr><th className="pb-2">Brand</th><th className="pb-2">Item</th><th className="pb-2">Qty</th><th className="pb-2">Cost</th><th className="pb-2 text-right">Total</th></tr>
                    </thead>
                    <tbody className="text-sm font-bold">
                        {items.map((item, index) => (
                            <tr key={index} className="border-t border-gray-50">
                                <td><input className="w-full py-3 outline-none" value={item.brand} onChange={(e) => { const n = [...items]; n[index].brand = e.target.value; setItems(n); }} /></td>
                                <td><input className="w-full py-3 outline-none" value={item.name} onChange={(e) => { const n = [...items]; n[index].name = e.target.value; setItems(n); }} /></td>
                                <td><input type="number" className="w-20 py-3 outline-none" value={item.qty} onChange={(e) => { const n = [...items]; n[index].qty = Number(e.target.value); setItems(n); }} /></td>
                                <td><input type="number" className="w-24 py-3 outline-none" value={item.price} onChange={(e) => { const n = [...items]; n[index].price = Number(e.target.value); setItems(n); }} /></td>
                                <td className="text-right text-[#1C3C85]">{(item.qty * item.price).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                <button onClick={() => setItems([...items, { brand: '', name: '', qty: 0, price: 0 }])} className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">+ Add Row</button>

                <div className="flex justify-between items-center bg-[#1C3C85] p-6 rounded-3xl text-white">
                    <div>
                        <p className="text-[10px] font-bold uppercase opacity-60">Inventory Investment</p>
                        <h4 className="text-2xl font-black">EGP {items.reduce((acc, i) => acc + (i.qty * i.price), 0).toLocaleString()}</h4>
                    </div>
                    <button onClick={calculateNetProfit} className="bg-white text-[#1C3C85] px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-gray-100">
                        {isLoading ? 'Scanning Orders...' : 'Calculate Net Profit'}
                    </button>
                </div>

                {netProfit !== null && (
                    <div className={`mt-4 p-6 rounded-3xl border-2 animate-in slide-in-from-top-2 ${netProfit >= 0 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                        <p className="text-[10px] font-black uppercase">Calculated Net Profit</p>
                        <h3 className="text-4xl font-black">EGP {netProfit.toLocaleString()}</h3>
                    </div>
                )}
            </div>
        </div>
    );
}