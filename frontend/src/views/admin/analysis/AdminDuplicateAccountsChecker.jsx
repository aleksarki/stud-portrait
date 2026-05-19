import { useEffect, useState } from "react";

import { getDuplicateAccounts, getPossibleDuplicateAccounts } from "../../../api";
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

// ─── Переиспользуемый блок карточки студента ──────────────────
const StudentCard = ({ student, emailKey, expandedStudent, toggleStudent }) => {
    const key = emailKey || student.student_name;
    const isOpen = expandedStudent === key;
    return (
        <div className="student-card">
            <div className="student-card-header" onClick={() => toggleStudent(key)}>
                <div className="student-info">
                    <span className="student-name">{student.student_name}</span>
                    {emailKey && (
                        <span className="student-email">{emailKey}</span>
                    )}
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
                            {account.email && (
                                <div className="account-email">📧 {account.email}</div>
                            )}
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
};

// ─── Главный компонент ────────────────────────────────────────
const AdminDuplicateAccountsChecker = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [possibleData, setPossibleData] = useState(null);
    const [expandedStudent, setExpandedStudent] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [r1, r2] = await Promise.all([
                fetch("http://localhost:8000/portrait/duplicate-accounts/"),
                fetch("http://localhost:8000/portrait/possible-duplicate-accounts/")
            ]);
            const [res1, res2] = await Promise.all([r1.json(), r2.json()]);

            if (res1.status === 'success') setData(res1.students || []);
            else console.error(res1.message);

            if (res2.status === 'success') setPossibleData(res2.students || []);
            else console.error(res2.message);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const toggleStudent = (key) => {
        setExpandedStudent(expandedStudent === key ? null : key);
    };

    const totalExactExtra  = data?.reduce((sum, s) => sum + (s.accounts_count - 1), 0) || 0;
    const totalPossible    = possibleData?.length || 0;

    return (
        <div className="AdminDuplicateAccountsChecker">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Проверка дублирующихся аккаунтов" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <LoadingSpinner loading={loading} text="Поиск дублирующихся аккаунтов..." />

                    {!loading && (
                        <>
                            <FlexRow wrap={WRAP.DO} gap="12" margin="16 0">
                                <ValueCard
                                    title="Точных дублей (по email)"
                                    value={data?.length || 0}
                                    tooltip="Студенты, у которых один email привязан к нескольким rsv_id"
                                />
                                <ValueCard
                                    title="Лишних аккаунтов"
                                    value={totalExactExtra}
                                    tooltip="Суммарное количество лишних аккаунтов среди точных дублей"
                                />
                                <ValueCard
                                    title="Возможных дублей"
                                    value={totalPossible}
                                    tooltip="Студенты с одинаковым ФИО и полом, но разными email"
                                />
                            </FlexRow>

                            {/* ── Точные дубли ── */}
                            <h2>Точные дубли (один email → несколько аккаунтов)</h2>
                            <p className="page-description">
                                Один и тот же email привязан к разным rsv_id.
                            </p>
                            {data && data.length === 0 && (
                                <NoData text="✅ Точных дублей не найдено." />
                            )}
                            <div className="duplicate-students-list">
                                {data?.map(student => (
                                    <StudentCard
                                        key={student.email}
                                        student={student}
                                        emailKey={student.email}
                                        expandedStudent={expandedStudent}
                                        toggleStudent={toggleStudent}
                                    />
                                ))}
                            </div>

                            {/* ── Возможные дубли ── */}
                            <h2 className="section-title-possible">
                                ⚠️ Возможные дубли (совпадение ФИО + пол, разные email)
                            </h2>
                            <p className="page-description">
                                Эти студенты имеют одинаковое ФИО и пол, но разные email или аккаунты.
                                Возможно, один человек — но могут быть и полные однофамильцы.
                            </p>
                            {possibleData && possibleData.length === 0 && (
                                <NoData text="✅ Возможных дублей не найдено." />
                            )}
                            <div className="duplicate-students-list">
                                {possibleData?.map(student => (
                                    <StudentCard
                                        key={student.student_name + student.gender}
                                        student={student}
                                        emailKey={null}
                                        expandedStudent={expandedStudent}
                                        toggleStudent={toggleStudent}
                                    />
                                ))}
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