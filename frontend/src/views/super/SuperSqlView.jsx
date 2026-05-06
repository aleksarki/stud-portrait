import { useState } from "react";

import { postAuditSQL } from "../../api";
import { SUPER_LINK_TREE } from "../../utilities";

import FlexColumn from "../../components/FlexColumn";
import FlexRow from "../../components/FlexRow";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import DbContentTable from "../../components/tables/DbContentTable";

import Button, { BUTTON_PALETTE } from "../../components/ui/Button";

import "./SuperSqlView.scss";
import LabelledBox from "../../components/LabelledBox";
import Label, { LABEL_PALETTE } from "../../components/ui/Label";

function SuperSqlView() {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const executeQuery = async () => {
        if (!query.trim()) return;
        
        setLoading(true);
        setError(null);
        setResult(null);
        
        postAuditSQL(query)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setResult(data.data);
                } else {
                    setError(data.message);
                }
            })
            .onError(err => {
                setError(err.message);
            })
            .finally(() => setLoading(false));
    };

    const clearConsole = () => {
        setQuery('');
        setResult(null);
        setError(null);
    };

    return (
        <div className="SuperSqlView">
            <SidebarLayout style={LAYOUT_STYLE.ADMIN}>
                <Header title="Суперадмин: SQL-звпросник" name="СуперАдминистратор1" />
                <Sidebar linkTree={SUPER_LINK_TREE} />
                <Content>
                    <h3>SQL Консоль</h3>
                    <FlexColumn>
                        <textarea
                            className="sql-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Введите SQL запрос...&#10;Например: SELECT * FROM auth_user LIMIT 10;"
                            rows={6}
                        />
                        <FlexRow>
                            <Button
                                text="Очистить"
                                onClick={clearConsole}
                                palette={BUTTON_PALETTE.RED}
                            />
                            <Button
                                text={loading ? 'Выполнение...' : 'Выполнить'}
                                onClick={executeQuery}
                                disabled={loading}
                                palette={BUTTON_PALETTE.GREEN}
                            />
                        </FlexRow>
                    </FlexColumn>
                    {(error || result) && <>
                        <h4>Результат:</h4>
                        {error && (
                            <FlexRow>
                                <Label
                                    text={error}
                                    palette={LABEL_PALETTE.RED}
                                />
                            </FlexRow>
                        )}
                        {result?.message && (
                            <FlexRow>
                                <Label
                                    text={result?.message}
                                    palette={LABEL_PALETTE.GREEN}
                                />
                            </FlexRow>
                        )}
                        {result?.rows && (
                            <FlexColumn>
                                <FlexRow>
                                    <Label
                                        text={`Найдено строк: ${result.row_count}`}
                                        palette={LABEL_PALETTE.GREEN}
                                    />
                                </FlexRow>
                                <LabelledBox label="Выбор">
                                    <DbContentTable data={result} />
                                </LabelledBox>
                            </FlexColumn>
                        )}
                    </>}
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default SuperSqlView;
