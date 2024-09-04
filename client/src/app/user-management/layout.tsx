"use client";
import MainLayout from "@/components/layouts/MainLayout";
import { SidebarProvider, useSidebarContext } from "@/context/SidebarContext";

export default function UserManagementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="w-full flex font-lato">
        <MainLayout/>
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}

const MainContent = ({ children }: { children: React.ReactNode }) => {
  const { isOpen } = useSidebarContext();
  
  return (
    <main className={`h-screen ${isOpen ? 'w-[calc(100%-280px)] ml-[280px] 2xl:ml-[360px] 2xl:w-[calc(100%-360px)] xl:w-[calc(100%-280px)]' : 'w-[calc(100%-120px)] ml-[120px]'} bg-background transition-all duration-400 ease-in-out`}>
      {children}
    </main>
  );
};