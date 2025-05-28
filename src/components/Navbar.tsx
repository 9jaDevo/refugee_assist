import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, Map, UserCircle, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const location = useLocation();
  
  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user || null);
      }
    );
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };
  
  const toggleMenu = () => setIsOpen(!isOpen);
  
  const isActive = (path: string) => 
    location.pathname === path 
      ? 'text-blue-600 font-medium' 
      : 'text-gray-600 hover:text-blue-500';
  
  return (
    <nav className="bg-white shadow-sm py-4 px-6 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="relative">
            <img 
              src="/chatbot-logo.png" 
              alt="RefugeeAssist Logo" 
              className="h-8 w-8 rounded-full"
            />
            <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
          </div>
          <span className="text-xl font-semibold text-blue-600">RefugeeAssist</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className={`flex items-center gap-2 ${isActive('/')}`}>
            <MessageSquare className="h-5 w-5" />
            <span>Chat</span>
          </Link>
          <Link to="/map" className={`flex items-center gap-2 ${isActive('/map')}`}>
            <Map className="h-5 w-5" />
            <span>Find Services</span>
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className={`flex items-center gap-2 ${isActive('/dashboard')}`}>
                <UserCircle className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              <button 
                onClick={handleSignOut}
                className="text-gray-600 hover:text-red-500"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className="bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 transition"
            >
              Volunteer Login
            </Link>
          )}
        </div>
        
        <button className="md:hidden" onClick={toggleMenu}>
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden mt-4 pb-4 flex flex-col gap-4">
          <Link 
            to="/" 
            className={`flex items-center gap-2 px-4 py-2 ${isActive('/')}`}
            onClick={toggleMenu}
          >
            <MessageSquare className="h-5 w-5" />
            <span>Chat</span>
          </Link>
          <Link 
            to="/map" 
            className={`flex items-center gap-2 px-4 py-2 ${isActive('/map')}`}
            onClick={toggleMenu}
          >
            <Map className="h-5 w-5" />
            <span>Find Services</span>
          </Link>
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-2 px-4 py-2 ${isActive('/dashboard')}`}
                onClick={toggleMenu}
              >
                <UserCircle className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              <button 
                onClick={() => {
                  handleSignOut();
                  toggleMenu();
                }}
                className="text-left px-4 py-2 text-gray-600 hover:text-red-500"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className="mx-4 bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 transition text-center"
              onClick={toggleMenu}
            >
              Volunteer Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}