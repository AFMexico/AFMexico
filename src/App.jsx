import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Video, Plus, Search, Calendar, ChevronRight, 
  ArrowLeft, Save, Headphones, PenTool, MessageCircle, Trash2, Loader2
} from 'lucide-react';

// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

// Credenciales de AFMexico integradas
const firebaseConfig = {
  apiKey: "AIzaSyAfCdZ43eAnDTClcCCIkv2q4ku_YgZvljg",
  authDomain: "afmexico-cc324.firebaseapp.com",
  projectId: "afmexico-cc324",
  storageBucket: "afmexico-cc324.firebasestorage.app",
  messagingSenderId: "904806146789",
  appId: "1:904806146789:web:79bb89271a155c30b86a0c",
  measurementId: "G-5PXYJQ96S5"
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

  // Autenticación anónima para que la app pueda leer/escribir en Firestore
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Error de autenticación:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Escuchar cambios en la base de datos
  useEffect(() => {
    if (!user) return;
    
    // Nombre de la colección en tu Firestore
    const classesRef = collection(db, 'lecciones_frances');
    
    const unsubscribe = onSnapshot(classesRef, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar por fecha (más recientes primero)
      fetched.sort((a, b) => new Date(b.date) - new Date(a.date));
      setClasses(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error de Firestore:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5 text-red-500" />;
      case 'audio': return <Headphones className="w-5 h-5 text-purple-500" />;
      case 'grammar': return <PenTool className="w-5 h-5 text-blue-500" />;
      case 'vocabulary': return <MessageCircle className="w-5 h-5 text-green-500" />;
      default: return <BookOpen className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type) => {
    const types = { video: 'Video', audio: 'Audio', grammar: 'Gramática', vocabulary: 'Vocabulario' };
    return types[type] || 'Lección';
  };

  const getLevelColor = (level) => {
    const colors = {
      'A1': 'bg-emerald-100 text-emerald-800', 'A2': 'bg-teal-100 text-teal-800',
      'B1': 'bg-blue-100 text-blue-800', 'B2': 'bg-indigo-100 text-indigo-800',
      'C1': 'bg-purple-100 text-purple-800', 'C2': 'bg-rose-100 text-rose-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const classesRef = collection(db, 'lecciones_frances');
      await addDoc(classesRef, { ...formData, createdAt: new Date().toISOString() });
      setCurrentView('list');
      setFormData({ title: '', level: 'A1', date: new Date().toISOString().split('T')[0], notes: '', type: 'vocabulary' });
    } catch (e) { 
      console.error("Error al guardar:", e); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!user) return;
    if (!window.confirm("¿Seguro que quieres borrar esta clase?")) return;
    try {
      await deleteDoc(doc(db, 'lecciones_frances', id));
      if (selectedClass?.id === id) setCurrentView('list');
    } catch (e) { 
      console.error("Error al borrar:", e); 
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <p className="text-slate-600 font-medium">Conectando con la Alianza Francesa...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {/* Navbar */}
      <header className="bg-white border-b sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => setCurrentView('list')}>
            <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-black shadow-md mr-3">AF</div>
            <h1 className="text-xl font-extrabold tracking-tight">Mes Cours</h1>
          </div>
          {currentView === 'list' && (
            <button 
              onClick={() => setCurrentView('add')} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl flex items-center font-bold transition-all shadow-lg active:scale-95"
            >
              <Plus className="w-5 h-5 mr-1" /> <span>Nouveau</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8">
        {/* Vista de Lista */}
        {currentView === 'list' && (
          <div className="space-y-6">
            <div className="relative group">
              <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <input 
                className="w-full p-4 pl-12 rounded-2xl border-none bg-white shadow-md focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                placeholder="Chercher une leçon..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {classes.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                <div 
                  key={c.id} 
                  onClick={() => { setSelectedClass(c); setCurrentView('detail'); }} 
                  className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider ${getLevelColor(c.level)}`}>
                      {c.level}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center font-medium">
                      <Calendar className="w-3.5 h-3.5 mr-1" /> {c.date}
                    </span>
                  </div>
                  <h3 className="font-bold text-xl mb-4 text-slate-800 line-clamp-2">{c.title}</h3>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <div className="flex items-center text-slate-500 font-bold text-sm">
                      {getTypeIcon(c.type)} <span className="ml-2 uppercase tracking-tighter text-xs">{getTypeLabel(c.type)}</span>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, c.id)} 
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              
              {classes.length === 0 && (
                <div className="col-span-full py-24 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                  <BookOpen className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Pas encore de leçons.<br/>Commencez par en ajouter une !</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vista de Detalle */}
        {currentView === 'detail' && selectedClass && (
          <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 bg-slate-50/80 border-b flex justify-between items-center">
              <button 
                onClick={() => setCurrentView('list')} 
                className="flex items-center text-slate-600 font-black hover:text-blue-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 mr-2"/> RETOUR
              </button>
              <span className={`text-xs font-black px-5 py-2 rounded-full shadow-sm ${getLevelColor(selectedClass.level)}`}>
                NIVEAU {selectedClass.level}
              </span>
            </div>
            <div className="p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl flex items-center font-bold text-sm">
                  {getTypeIcon(selectedClass.type)} <span className="ml-2 uppercase">{getTypeLabel(selectedClass.type)}</span>
                </span>
                <span className="text-slate-400 font-bold text-sm">{selectedClass.date}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-10 leading-tight">
                {selectedClass.title}
              </h2>
              <div className="bg-slate-50 p-8 md:p-10 rounded-[32px] whitespace-pre-wrap text-slate-800 leading-relaxed text-lg border border-slate-100 shadow-inner min-h-[400px]">
                {selectedClass.notes}
              </div>
            </div>
          </div>
        )}

        {/* Formulario de Agregar */}
        {currentView === 'add' && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center mb-8">
              <button 
                onClick={() => setCurrentView('list')} 
                className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mr-4 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-slate-600"/>
              </button>
              <h2 className="text-3xl font-black text-slate-900">Nouvelle Leçon</h2>
            </div>
            
            <form onSubmit={handleAddClass} className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl space-y-8 border border-slate-100">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase ml-1">Titre du cours</label>
                <input 
                  required 
                  className="w-full p-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg font-bold" 
                  placeholder="Ej: Le Passé Composé" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase ml-1">Niveau</label>
                  <select 
                    className="w-full p-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-100 outline-none font-bold appearance-none" 
                    value={formData.level} 
                    onChange={e => setFormData({...formData, level: e.target.value})}
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase ml-1">Date</label>
                  <input 
                    type="date" 
                    className="w-full p-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-100 outline-none font-bold" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase ml-1">Type de Leçon</label>
                <div className="grid grid-cols-2 gap-3">
                  {['vocabulary', 'grammar', 'audio', 'video'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({...formData, type: t})}
                      className={`p-4 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${formData.type === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      {getTypeIcon(t)} <span className="capitalize">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase ml-1">Contenu (Apuntes)</label>
                <textarea 
                  required 
                  rows="10" 
                  className="w-full p-6 bg-slate-50 border-none rounded-[32px] focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium leading-relaxed" 
                  placeholder="Vocabulaire, règles, exemples..." 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                />
              </div>

              <button 
                disabled={isSaving} 
                className="w-full bg-blue-700 hover:bg-blue-800 text-white p-6 rounded-[32px] font-black text-xl flex justify-center items-center shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin w-8 h-8" /> : <Save className="w-7 h-7 mr-3" />} ENREGISTRER
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

