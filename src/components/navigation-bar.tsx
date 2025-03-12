import LanguageSelector from "./ui/language-selector";

export default function NavigationBar() {
    return (
        <nav className="flex items-center justify-end p-4 bg-[#156082] text-white shadow-md">
            <div className="transition-all duration-200 hover:opacity-80">
                <LanguageSelector />
            </div>
        </nav>
    );
}
