import React from "react";
import { RetailerSidebar } from "./RetailerSidebar";
import { Outlet } from "react-router-dom";

export function RetailerLayout({ children }) {
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden w-full">
            <RetailerSidebar />

            {/* Main Content */}
            <div className="flex-1 lg:pl-64 h-full relative overflow-hidden">
                <main className="h-full overflow-y-auto overflow-x-hidden">
                    <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
                        {children || <Outlet />}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default RetailerLayout;
