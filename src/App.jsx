import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Video, Plus, Search, Calendar, ChevronRight, 
  ArrowLeft, Save, Headphones, PenTool, MessageCircle, Trash2, Loader2
} from 'lucide-react';

// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

// Estas variables se llenan automáticamente en el entorno de ejecución del chat,
// pero para tu Vercel personal, asegúrate de configurar las variables de entorno si fuera necesario.
// Por ahora, el código detecta si existen o usa valores por defecto.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appIdSlug = typeof __app_id !== 'undefined' ? __app_id : 'french-app-v1';

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

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const classesRef = collection(db, 'artifacts', appIdSlug, 'public', 'data', 'french_classes');
    const unsubscribe = onSnapshot(classesRef, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => new Date(b.date) - new Date(a.date));
      setClasses(fetched);
      setLoading(false);
    }, () => setLoading(false));
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
      const classesRef = collection(db, 'artifacts', appIdSlug, 'public', 'data', 'french_classes');
      await addDoc(classesRef, { ...formData, createdAt: new Date().toISOString() });
      setCurrentView('list');
      setFormData({ title: '', level: 'A1', date: new Date().toISOString().split('T')[0], notes: '', type: 'vocabulary' });
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appIdSlug, 'public', 'data', 'french_classes', id));
      if (selectedClass?.id === id) setCurrentView('list');
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => setCurrentView('list')}>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-2">fr</div>
            <h1 className="text-xl font-bold">Mes Cours</h1>
          </div>
          {currentView === 'list' && (
            <button onClick={() => setCurrentView('add')} className="bg-blue-600 text-white p-2 rounded-lg flex items-center">
              <Plus className="w-5 h-5 mr-1" /> <span className="hidden sm:inline">Nueva Clase</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8">
        {currentView === 'list' && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input 
                className="w-full p-3 pl-10 rounded-xl border border-gray-200" 
                placeholder="Buscar clase..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                <div key={c.id} onClick={() => { setSelectedClass(c); setCurrentView('detail'); }} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300">
                  <div className="flex justify-between mb-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${getLevelColor(c.level)}`}>{c.level}</span>
                    <span className="text-xs text-gray-400">{c.date}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{c.title}</h3>
                  <div className="flex justify-between items-center text-blue-600 text-sm">
                    <span className="flex items-center">{getTypeIcon(c.type)} <span className="ml-2">{getTypeLabel(c.type)}</span></span>
                    <Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500" onClick={(e) => handleDelete(e, c.id)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'detail' && selectedClass && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <button onClick={() => setCurrentView('list')} className="flex items-center text-gray-600"><ArrowLeft className="w-4 h-4 mr-1"/> Volver</button>
              <span className={`text-xs font-bold px-3 py-1 rounded ${getLevelColor(selectedClass.level)}`}>{selectedClass.level}</span>
            </div>
            <div className="p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-4">{selectedClass.title}</h2>
              <div className="bg-blue-50 p-6 rounded-xl whitespace-pre-wrap text-slate-800">{selectedClass.notes}</div>
            </div>
          </div>
        )}

        {currentView === 'add' && (
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Nueva Lección</h2>
            <form onSubmit={handleAddClass} className="bg-white p-6 rounded-2xl border space-y-4">
              <input required className="w-full p-3 border rounded-lg" placeholder="Título" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="p-3 border rounded-lg" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}>
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <input type="date" className="p-3 border rounded-lg" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <select className="w-full p-3 border rounded-lg" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="vocabulary">Vocabulario</option>
                <option value="grammar">Gramática</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
              </select>
              <textarea required rows="6" className="w-full p-3 border rounded-lg" placeholder="Apuntes..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              <button disabled={isSaving} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold flex justify-center items-center">
                {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5 mr-2" />} Guardar Clase
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
