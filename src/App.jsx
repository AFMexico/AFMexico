import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Video, Plus, Search, Calendar, 
  ArrowLeft, Save, Headphones, PenTool, MessageCircle, Trash2, Loader2
} from 'lucide-react';

// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

// TUS CREDENCIALES (Copiadas de tu mensaje anterior)
const firebaseConfig = {
  apiKey: "AIzaSyAHMJNsNGD2YoHGnlwMehdSfhjkUUTOnJ4",
  authDomain: "afmexico-2403f.firebaseapp.com",
  projectId: "afmexico-2403f",
  storageBucket: "afmexico-2403f.firebasestorage.app",
  messagingSenderId: "769195067838",
  appId: "1:769195067838:web:b386b81b532e1455b111ef",
  measurementId: "G-V8F81H37KS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [classes, setClasses] = useState([]);
  const [currentView, setCurrentView] = useState('list');
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    level: 'A1',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    type: 'vocabulary'
  });

  // 1. Autenticación
  useEffect(() => {
    const login = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Error Auth:", err);
      }
    };
    login();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  // 2. Cargar Datos
  useEffect(() => {
    if (!user) return;
    const ref = collection(db, 'clases_af_mexico');
    const unsubscribe = onSnapshot(ref, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setClasses(data);
      setLoading(false);
    }, (err) => {
      console.error("Error Firestore:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'clases_af_mexico'), {
        ...formData,
        createdAt: new Date().toISOString()
      });
      setFormData({ title: '', level: 'A1', date: new Date().toISOString().split('T')[0], notes: '', type: 'vocabulary' });
      setCurrentView('list');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("¿Borrar lección?")) return;
    await deleteDoc(doc(db, 'clases_af_mexico', id));
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando Alianza Francesa...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('list')}>
          <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-black">AF</div>
          <span className="font-black text-xl tracking-tighter">MES COURS</span>
        </div>
        {currentView === 'list' && (
          <button onClick={() => setCurrentView('add')} className="bg-blue-600 text-white p-2 rounded-xl shadow-lg">
            <Plus className="w-6 h-6" />
          </button>
        )}
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {currentView === 'list' && (
          <div className="space-y-6 mt-4">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input 
                className="w-full p-4 pl-12 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500" 
                placeholder="Buscar lección..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                <div key={c.id} onClick={() => {setSelectedClass(c); setCurrentView('detail')}} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full uppercase">{c.level}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{c.date}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-4">{c.title}</h3>
                  <div className="flex justify-between items-center border-t pt-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{c.type}</span>
                    <Trash2 className="w-4 h-4 text-slate-200 hover:text-red-500" onClick={(e) => handleDelete(e, c.id)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'add' && (
          <form onSubmit={handleSave} className="bg-white p-8 rounded-[40px] shadow-xl space-y-6 mt-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Nueva Lección</h2>
            <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" placeholder="Título" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <select className="p-4 bg-slate-50 rounded-2xl border-none font-bold" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}>
                {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l}>{l}</option>)}
              </select>
              <input type="date" className="p-4 bg-slate-50 rounded-2xl border-none font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <textarea required rows="8" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" placeholder="Apuntes de la clase..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            <button className="w-full bg-blue-700 text-white p-5 rounded-[30px] font-black text-xl shadow-xl active:scale-95 transition-all">
              {isSaving ? "GUARDANDO..." : "GUARDAR CLASE"}
            </button>
          </form>
        )}

        {currentView === 'detail' && selectedClass && (
          <div className="bg-white rounded-[40px] shadow-xl mt-4 overflow-hidden">
            <div className="p-6 bg-slate-50 flex justify-between items-center border-b">
              <button onClick={() => setCurrentView('list')} className="font-black text-xs text-slate-500 uppercase flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-[10px] font-black uppercase">Nivel {selectedClass.level}</span>
            </div>
            <div className="p-8">
              <h2 className="text-3xl font-black mb-6 leading-none">{selectedClass.title}</h2>
              <div className="bg-slate-50 p-6 rounded-3xl whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
                {selectedClass.notes}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

