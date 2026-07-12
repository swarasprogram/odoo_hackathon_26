import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, headerActions }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Header actions={headerActions} />
        <div className="page fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
