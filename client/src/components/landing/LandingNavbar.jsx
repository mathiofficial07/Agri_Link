import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LayoutDashboard, LogOut, User, RefreshCw } from "lucide-react";
import GoogleTranslate from "../GoogleTranslate";
import { useAuth } from "../../contexts/AuthContext";

const navLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Buyer Marketplace", href: "/buyer/dashboard" },
    { label: "IoT Transport Monitoring", href: "/transport/TR001" },
    { label: "FAQ", href: "/#faq" },
];

const LandingNavbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleNavClick = (href) => {
        setMenuOpen(false);
        if (href.startsWith("/#")) {
            const id = href.slice(2);
            if (location.pathname === "/") {
                const el = document.getElementById(id);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                }
            } else {
                navigate("/");
                setTimeout(() => {
                    const el = document.getElementById(id);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                }, 100);
            }
        } else {
            navigate(href);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                scrolled
                    ? "bg-gradient-to-r from-emerald-50/95 via-white/95 to-emerald-50/95 backdrop-blur-xl border-b border-emerald-100/50 shadow-lg shadow-emerald-500/10"
                    : "bg-gradient-to-r from-emerald-600/10 via-transparent to-emerald-600/10 backdrop-blur-sm"
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link
                    to="/"
                    className="group flex items-center transition-all duration-300 hover:scale-105"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                    <img 
                        src="/logo.png" 
                        alt="AgriLink Logo" 
                        className="w-16 h-16 object-contain"
                    />
                </Link>

                {/* Navigation Links */}
                <div className="hidden lg:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <button
                            key={link.label}
                            onClick={() => handleNavClick(link.href)}
                            className={`relative px-4 py-2 font-inter-semibold text-sm transition-all duration-300 hover:text-emerald-700 group ${
                                scrolled ? "text-gray-700" : "text-white"
                            }`}
                        >
                            {link.label}
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <GoogleTranslate landingPage={true} />

                    <div className="hidden lg:flex items-center gap-3">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-2">
                                <Link 
                                    to="/dashboard" 
                                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-md flex items-center gap-1.5"
                                >
                                    <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard ({user?.role || 'User'})
                                </Link>

                                <Link 
                                    to="/login" 
                                    className="px-3.5 py-2.5 rounded-2xl bg-white/90 hover:bg-white text-emerald-800 font-bold text-xs transition border border-emerald-200 shadow-sm flex items-center gap-1.5"
                                >
                                    Log In (Any Role)
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200 shadow-sm flex items-center gap-1"
                                    title="Log out"
                                >
                                    <LogOut className="w-3.5 h-3.5 text-slate-600" /> Log Out
                                </button>
                            </div>
                        ) : (
                            <>
                                <Link 
                                    to="/login" 
                                    className={`group relative px-6 py-2.5 rounded-2xl backdrop-blur-sm border font-inter-semibold text-xs transition-all duration-300 shadow-sm hover:shadow-md ${
                                        scrolled 
                                            ? "bg-white/50 border-emerald-200/50 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300" 
                                            : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                                    }`}
                                >
                                    Log In
                                </Link>
                                <Link 
                                    to="/register" 
                                    className="group relative px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-inter-semibold text-xs hover:from-emerald-600 hover:to-emerald-800 transition-all duration-300 shadow-lg shadow-emerald-500/25"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile toggle */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`lg:hidden relative p-3 rounded-2xl backdrop-blur-sm border transition-all duration-300 shadow-sm hover:shadow-md ${
                            scrolled 
                                ? "bg-white/50 border-emerald-200/50 hover:bg-white hover:border-emerald-300" 
                                : "bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/30"
                        }`}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                    >
                        {menuOpen ? (
                            <X className={`h-6 w-6 transition-colors duration-500 ${
                                scrolled ? "text-emerald-600" : "text-white"
                            }`} />
                        ) : (
                            <Menu className={`h-6 w-6 transition-colors duration-500 ${
                                scrolled ? "text-emerald-600" : "text-white"
                            }`} />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="lg:hidden bg-gradient-to-b from-white/95 to-emerald-50/95 backdrop-blur-xl border-t border-emerald-100/50 shadow-xl">
                    <div className="px-6 py-8 space-y-6">
                        {navLinks.map((link) => (
                            <button
                                key={link.label}
                                onClick={() => handleNavClick(link.href)}
                                className="block w-full text-left text-lg font-inter-semibold text-gray-800 hover:text-emerald-700 transition-colors duration-300 py-3 border-b border-gray-100 hover:border-emerald-200"
                            >
                                {link.label}
                            </button>
                        ))}
                        <div className="border-t border-emerald-200 pt-6">
                            <div className="mb-6">
                                <GoogleTranslate landingPage={true} />
                            </div>
                            <div className="flex flex-col gap-4">
                                {isAuthenticated ? (
                                    <>
                                        <Link 
                                            to="/dashboard" 
                                            onClick={() => setMenuOpen(false)}
                                            className="w-full text-center py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-inter-semibold text-lg"
                                        >
                                            Go to Dashboard ({user?.role})
                                        </Link>
                                        <Link 
                                            to="/login" 
                                            onClick={() => setMenuOpen(false)} 
                                            className="w-full text-center py-3 rounded-2xl bg-white border border-emerald-300 text-emerald-800 font-bold text-base"
                                        >
                                            Log In (Any Role)
                                        </Link>
                                        <button
                                            onClick={() => { setMenuOpen(false); handleLogout(); }}
                                            className="w-full text-center py-3 rounded-2xl bg-slate-200 text-slate-800 font-bold text-base"
                                        >
                                            Log Out
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link 
                                            to="/login" 
                                            onClick={() => setMenuOpen(false)} 
                                            className="w-full text-center py-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-emerald-200/50 text-emerald-700 font-inter-semibold text-lg hover:bg-emerald-50"
                                        >
                                            Log In
                                        </Link>
                                        <Link 
                                            to="/register" 
                                            onClick={() => setMenuOpen(false)} 
                                            className="w-full text-center py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-inter-semibold text-lg"
                                        >
                                            Get Started
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default LandingNavbar;
