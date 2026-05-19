import { useEffect, useState } from "react";

import { LINK_TREE } from "../../../utilities";

import FlexRow, { WRAP } from "../../../components/FlexRow";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";

import ValueCard from "../../../components/cards/ValueCard";

import Button from "../../../components/ui/Button";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import NoData from "../../../components/ui/NoData";
import { ADMIN_PALETTE } from "../../../components/ui/palette";

import Table, { TableHeader, TableItem, TableRow } from "../../../components/tables/Table";

import "./AdminDuplicateAccountsChecker.scss";

const AdminDuplicateAccountsChecker = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [expandedStudent, setExpandedStudent] = useState(null);

    // ИСПРАВЛЕНИЕ: переписан на async/await, чтобы setLoading(false) гарантированно
    // вызывался в finally — даже если r.json() упадёт с ошибкой парсинга.
    // В предыдущей версии через AsyncChain .finally() мог не сработать при сбое
    // в промежуточном .onSuccess(), потому что .onError() не пробрасывал ошибку дальше.
    const fetchData = async () => {
        setLoading(true);
        try {
            const r = await fetch("http://localhost:8000/portrait/duplicate-accounts/");
            const res = await r.json();
            if (res.status === 'success') {
                setData(res.students || []);
            } else {
                console.error(res.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleStudent = (email) => {
        setExpandedStudent(expandedStudent === email ? null : email);
    };

    // ИСПРАВЛЕНИЕ: переименована переменная и исправлена логика подсчёта.
    // accounts_count — это ОБЩЕЕ число аккаунтов у студента (включая «основной»).
    // Дублирующихся = accounts_count - 1 на каждого студента.
    // Карточки разделены: одна показывает студентов с дублями,
    // вторая — суммарное число «лишних» аккаунтов (именно дублей, не всех аккаунтов).
    const totalExtraAccounts = data?.reduce((sum, s) => sum + (s.accounts_count - 1), 0) || 0;

    return (
        <div className="AdminDuplicateAccountsChecker">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Проверка дублирующихся аккаунтов" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>Студенты с несколькими RSV ID (один email → несколько аккаунтов)</h2>
                    <p className="page-description">
                        В этой таблице показаны студенты, у которых один и тот же email привязан к разным
                        идентификаторам тестирования (rsv_id). Это может означать, что студент использовал
                        несколько аккаунтов в разные годы. Ниже приведены детали по каждому аккаунту.
                    </p>

                    <LoadingSpinner loading={loading} text="Поиск дублирующихся аккаунтов..." />

                    {!loading && data && data.length === 0 && (
                        <NoData text="✅ Студенты с несколькими аккаунтами не найдены." />
                    )}

                    {!loading && data && data.length > 0 && (
                        <>
                            <FlexRow wrap={WRAP.DO} gap="12" margin="16 0">
                                <ValueCard
                                    title="Студентов с дублями"
                                    value={data.length}
                                    tooltip="Количество студентов, у которых один email привязан к нескольким rsv_id"
                                />
                                <ValueCard
                                    title="Лишних аккаунтов (дублей)"
                                    value={totalExtraAccounts}
                                    tooltip="Суммарное количество дублирующихся аккаунтов (accounts_count - 1 на каждого студента)"
                                />
                            </FlexRow>

                            <div className="duplicate-students-list">
                                {data.map(student => {
                                    const isOpen = expandedStudent === student.email;
                                    return (
                                        <div key={student.email} className="student-card">
                                            <div
                                                className="student-card-header"
                                                onClick={() => toggleStudent(student.email)}
                                            >
                                                <div className="student-info">
                                                    <span className="student-name">{student.student_name}</span>
                                                    <span className="student-email">{student.email}</span>
                                                </div>
                                                <div className="student-badge">
                                                    <span className="accounts-count">Аккаунтов: {student.accounts_count}</span>
                                                    <span className="expand-icon">{isOpen ? '▲' : '▼'}</span>
                                                </div>
                                            </div>

                                            {isOpen && (
                                                <div className="student-card-body">
                                                    {student.accounts.map((account, idx) => (
                                                        <div key={account.rsv_id} className="account-block">
                                                            <h4>Аккаунт #{idx + 1}: {account.rsv_id}</h4>
                                                            {!account.exists_in_participants ? (
                                                                <div className="no-participant-warning">
                                                                    ⚠️ Этот RSV ID не найден в таблице участников (нет результатов)
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="account-meta">
                                                                        <span>Пол: {
                                                                            account.gender === 'М' ? 'Мужской' :
                                                                            account.gender === 'Ж' ? 'Женский' : 'Не указан'
                                                                        }</span>
                                                                        <span>ID участника: {account.participant_id}</span>
                                                                    </div>
                                                                    {account.results.length === 0 ? (
                                                                        <div className="no-results">Нет записей результатов</div>
                                                                    ) : (
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableItem>Год</TableItem>
                                                                                <TableItem>Курс</TableItem>
                                                                                <TableItem>Учебное заведение</TableItem>
                                                                                <TableItem>Направление</TableItem>
                                                                                <TableItem>Лидерство (балл)</TableItem>
                                                                            </TableHeader>
                                                                            {account.results.map((res, ri) => (
                                                                                <TableRow key={ri}>
                                                                                    <TableItem>{res.year}</TableItem>
                                                                                    <TableItem>{res.course}</TableItem>
                                                                                    <TableItem>{res.institution || '—'}</TableItem>
                                                                                    <TableItem>{res.specialty || '—'}</TableItem>
                                                                                    <TableItem>{res.competency_leadership ?? '—'}</TableItem>
                                                                                </TableRow>
                                                                            ))}
                                                                        </Table>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="duplicate-actions">
                                <Button
                                    text="Обновить"
                                    onClick={fetchData}
                                    disabled={loading}
                                    palette={ADMIN_PALETTE.BLUE}
                                />
                            </div>
                        </>
                    )}
                </Content>
            </SidebarLayout>
        </div>
    );
};

export { AdminDuplicateAccountsChecker };
export default AdminDuplicateAccountsChecker;