import MainLayout from './components/layout/MainLayout';
import Introduction from './components/layout/Introduction';
import TranslationForm from './components/translation-form';

export default function App() {
  return (
    <MainLayout>
      <div className="flex flex-col lg:flex-row gap-12">
        <Introduction />
        <div className="lg:w-2/3">
          <TranslationForm />
        </div>
      </div>
    </MainLayout>
  );
}
