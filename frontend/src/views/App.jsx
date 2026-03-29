import { Content, Header, SidebarLayout } from '../components/SidebarLayout';
import './App.scss';

function App() {
  return (
    <div className="App">
      <SidebarLayout>
        <Header />
        <Content>
          <span>First steps</span>
        </Content>
      </SidebarLayout>
    </div>
  );
}

export default App;
