import { useEffect, useState } from 'react';
import { LAYOUT_STYLE, Content, Header, SidebarLayout } from '../components/SidebarLayout';
import './main_.scss';
function StatsSection({ data }) {
  const items = [
    { value: data?.results ?? '—', label: 'Всего тестирований', suffix: '' },
    { value: data?.unis ?? '—', label: 'Учебных заведений', suffix: '' },
    { value: data?.centers ?? '—', label: 'Центров Компетенций', suffix: '' },
    {
      value: data?.years ? `${data.years.min}–${data.years.max}` : '—',
      label: 'Охват по годам',
      suffix: '',
    }
  ];

  return (
    <section className="stats">
      <div className="container">
        <div className="stats__grid">
          {items.map((item, i) => (
            <div className="stat-card" key={i} style={{ '--delay': `${i * 0.1}s` }}>
              <span className="stat-card__value">
                {item.value}
                {item.suffix && <sup>{item.suffix}</sup>}
              </span>
              <span className="stat-card__label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MainPage() {
  const [statsData, setStatsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadCounts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:8000/portrait/overall-stats');
        if (!response.ok) throw new Error('Ошибка сервера');
        const data = await response.json();
        setStatsData(data);
      } catch (err) {
        console.error('Ошибка при загрузке статистики:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadCounts();
  }, []);

  const features = [
    { icon: "", title: 'Личный профиль', color: 'var(--accent-1)' },
    { icon: "", title: 'Аналитика результатов', color: 'var(--accent-2)' },
    { icon: "", title: 'Сравнение показателей', color: 'var(--accent-3)' },
    { icon: "", title: 'Экспорт данных', color: 'var(--accent-4)' },
  ];

  return (
    <div className="MainPage">
      <SidebarLayout style={LAYOUT_STYLE.NORMAL}>
        <Header title=" " name="Вход" />
        <Content>
          <section className="hero">
            <div className="hero__bg" aria-hidden="true" />
            <div className="hero__overlay" aria-hidden="true" />
            <div className="container hero__content">
              <h1 className="hero__title">
                Studportrait<br />
              </h1>
              <p className="hero__sub">
                Анализ компетенций и мониторинг развития студентов
              </p>
            </div>
            <div className="hero__scroll-hint" aria-hidden="true">
              <span />
            </div>
          </section>

          {/* ЦК */}
          <section className="section">
            <div className="container about">
              <div className="section__header">
                <h2 className="section__title">О центрах компетенций</h2>
              </div>
              <div className="about__body">
                <p className="about__text">Главная цель проекта — дать возможность каждому студенту в университетах и колледжах оценить свои надпрофессиональные компетенции и построить индивидуальную траекторию развития для самореализации в карьерной, образовательной и общественной сферах, в том числе через участие в конкурсах и проектах Президентской платформы «Россия — страна возможностей» и партнеров экосистемы.</p>
              </div>
            </div>
          </section>

          {/* РСВ */}
          <section className="section">
            <div className="container rsv">
              <div className="rsv__body">
                <h2 className="section__title">Россия - страна возможностей</h2>
                <p className="about__text">
                  Президентская платформа, на которой представлены проекты для людей разных возрастов и интересов — для школьников, студентов, молодых специалистов, семей, опытных управленцев, профильных кадров и представителей рабочих профессий.
                </p>
                <p className="about__text">
                   <h4>Как проходит тестирование? </h4>
                    После заполнения анкеты каждому участнику станет доступен этап диагностики. Он включает 9 тестов: 5 базовых (обязательных для прохождения) и 4 дополнительных.
                  
                </p>
                
                <div className="rsv_data">
                  {[
                    { num: 12, label: 'Компетенций' },
                    { num: 16, label: 'Мотиваторов' },
                    { num: 8,  label: 'Ценностей'  },
                  ].map(({ num, label }) => (
                    <div className="rsv_item" key={label}>
                      <span className="rsv_number">{num}</span>
                      <span className="rsv_text">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* статистика */}
          {isLoading ? (
            <section className="stats">
              <div className="container">
                <p className="loading-text"> </p>
              </div>
            </section>
          ) : (
            <StatsSection data={statsData} />
          )}

          {/* тут типа функционал */}
          <section className="section">
            <div className="container">
              <div className="section__header section__header--center">
                <h2 className="section__title">Возможности приложения</h2>
              </div>
              <div className="features__grid">
                {features.map((feat, i) => (
                  <div
                    className="feature-card"
                    key={i}
                    style={{ '--accent': feat.color, '--delay': `${i * 0.08}s` }}
                  >
                    <div className="feature-card__icon">{feat.icon}</div>
                    <h3 className="feature-card__title">{feat.title}</h3>
                    <p className="feature-card__text">текст</p>
                    <div className="feature-card__bar" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/*footer */}
          <footer className="footer">
            <div className="container footer__inner">
              <p className="footer__brand">StudPortrait</p>
              <p className="footer__copy">© {new Date().getFullYear()}</p> </div>
          </footer>
        </Content>
      </SidebarLayout>
    </div>
  );
}

export default Main_;
