import { useRouteError } from 'react-router-dom';
import Header from '../components/Header';
import './ErrorView.scss';

function ErrorView() {
    const error = useRouteError();
    console.error(error);
    return (
        <div className="ErrorView">
            <Header />
            <div className="page-title">
                <span>Несуществующая страница</span>
            </div>
        </div>
    );
}

export default ErrorView;
