import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Video, Plus, Search, Calendar, ChevronRight, 
  ArrowLeft, Save, Headphones, PenTool, MessageCircle, Trash2, Loader2
} from 'lucide-react';

// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [classes, setClasses] = useState([]);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'detail', 'add'
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    level: 'A1',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    type: 'vocabulary'
  });

  // 1. Initialize Auth
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error al autenticar:", error);
      }
    };
    
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch Public Data
  useEffect(() => {
    if (!user || !db) return;

    // Usamos una colección pública para que todos los alumnos puedan verla
    const classesRef = collection(db, 'artifacts', appId, 'public', 'data', 'french_classes');
    
    const unsubscribe = onSnapshot(classesRef, (snapshot) => {
      const fetchedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar por fecha en memoria (las más nuevas primero)
      fetchedClasses.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setClasses(fetchedClasses);
      setLoading(false);
    }, (error) => {
      console.error("Error obteniendo clases:", error);
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
    const types = {
      video: 'Video',
      audio: 'Audio',
      grammar: 'Gramática',
      vocabulary: 'Vocabulario'
    };
    return types[type] || 'Lección';
  };

  const getLevelColor = (level) => {
    const colors = {
      'A1': 'bg-emerald-100 text-emerald-800',
      'A2': 'bg-teal-100 text-teal-800',
      'B1': 'bg-blue-100 text-blue-800',
      'B2': 'bg-indigo-100 text-indigo-800',
      'C1': 'bg-purple-100 text-purple-800',
      'C2': 'bg-rose-100 text-rose-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!user || !db) return;

    setIsSaving(true);
    try {
      const classesRef = collection(db, 'artifacts', appId, 'public', 'data', 'french_classes');
      await addDoc(classesRef, {
        ...formData,
        createdAt: new Date().toISOString()
      });
      
      setCurrentView('list');
      setFormData({
        title: '',
        level: 'A1',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        type: 'vocabulary'
      });
    } catch (error) {
      console.error("Error al guardar la clase:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClass = async (e, classId) => {
    e.stopPropagation(); // Evita que se abra el detalle al hacer clic en borrar
    if (!user || !db) return;
    
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'french_classes', classId);
      await deleteDoc(docRef);
      if (selectedClass?.id === classId) {
        setCurrentView('list');
      }
    } catch (error) {
      console.error("Error al eliminar la clase:", error);
    }
  };

  const openClassDetail = (cls) => {
    setSelectedClass(cls);
    setCurrentView('detail');
  };

  const filteredClasses = classes.filter(cls => 
    cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.notes && cls.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Cargando las clases de francés...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header/Nav */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => setCurrentView('list')}
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-3 shadow-inner">
                <span className="text-white font-bold text-lg">fr</span>
              </div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Mes Cours</h1>
            </div>
            {currentView === 'list' && (
              <button
                onClick={() => setCurrentView('add')}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Nouvelle Leçon</span>
                <span className="sm:hidden">Ajouter</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* LIST VIEW */}
        {currentView === 'list' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search Bar */}
            <div className="relative mb-8">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Chercher une leçon... (Buscar clase)"
                className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm shadow-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Classes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((cls) => (
                  <div 
                    key={cls.id} 
                    onClick={() => openClassDetail(cls)}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                          {getTypeIcon(cls.type)}
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${getLevelColor(cls.level)}`}>
                          {cls.level}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-400 text-sm">
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        {cls.date}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 pr-8">
                      {cls.title}
                    </h3>
                    
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                      {cls.notes}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                        Voir la leçon <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </div>
                      
                      {/* Delete Button (Profesor Only ideally, but available here for management) */}
                      <button 
                        onClick={(e) => handleDeleteClass(e, cls.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar clase"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Aucune leçon trouvée</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Aún no hay clases registradas. ¡Haz clic en "Nouvelle Leçon" para agregar la primera!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DETAIL VIEW */}
        {currentView === 'detail' && selectedClass && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-b bg-slate-50/50 p-4 sm:p-6 flex items-center justify-between">
              <button 
                onClick={() => setCurrentView('list')}
                className="flex items-center text-slate-600 hover:text-slate-900 font-medium transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Retour</span>
              </button>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => handleDeleteClass(e, selectedClass.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar clase"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-md ${getLevelColor(selectedClass.level)}`}>
                  Niveau {selectedClass.level}
                </span>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 md:p-10">
              <div className="flex flex-wrap items-center gap-3 mb-6 text-slate-500 text-sm font-medium">
                <span className="flex items-center bg-slate-100 px-3 py-1 rounded-full text-slate-700">
                  {getTypeIcon(selectedClass.type)}
                  <span className="ml-2">{getTypeLabel(selectedClass.type)}</span>
                </span>
                <span className="flex items-center px-2">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  {selectedClass.date}
                </span>
              </div>
              
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-8 tracking-tight">
                {selectedClass.title}
              </h2>
              
              <div className="prose max-w-none text-slate-700">
                <h4 className="flex items-center text-lg font-bold text-slate-900 mb-4">
                  <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                  Notes de cours (Apuntes)
                </h4>
                <div className="bg-blue-50/30 rounded-2xl p-6 border border-blue-100 whitespace-pre-wrap leading-relaxed text-slate-800 shadow-inner">
                  {selectedClass.notes}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD CLASS FORM */}
        {currentView === 'add' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center mb-6">
              <button 
                onClick={() => setCurrentView('list')}
                className="flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-900 transition-colors mr-4 bg-white rounded-full shadow-sm border border-slate-200 hover:bg-slate-50"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ajouter une leçon</h2>
            </div>

            <form onSubmit={handleAddClass} className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-8">
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Titre de la leçon (Título)</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                    placeholder="Ej: Los números del 1 al 20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Niveau (Nivel)</label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm"
                    >
                      <option value="A1">A1 (Débutant)</option>
                      <option value="A2">A2 (Élémentaire)</option>
                      <option value="B1">B1 (Intermédiaire)</option>
                      <option value="B2">B2 (Intermédiaire Supérieur)</option>
                      <option value="C1">C1 (Avancé)</option>
                      <option value="C2">C2 (Maîtrise)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Date (Fecha)</label>
                    <input
                      type="date"
                      name="date"
                      required
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Type de contenu (Tipo)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['vocabulary', 'grammar', 'audio', 'video'].map((type) => (
                      <label 
                        key={type} 
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.type === type 
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={type}
                          checked={formData.type === type}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className={`${formData.type === type ? 'scale-110' : 'scale-100'} transition-transform`}>
                          {getTypeIcon(type)}
                        </div>
                        <span className="mt-2 text-sm font-semibold">{getTypeLabel(type)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes (Tus apuntes)</label>
                  <textarea
                    name="notes"
                    required
                    rows={6}
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y shadow-sm"
                    placeholder="Escribe aquí el vocabulario, conjugaciones, o frases clave de la clase..."
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  {isSaving ? 'Enregistrement...' : 'Enregistrer (Guardar)'}
                </button>
              </div>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}


