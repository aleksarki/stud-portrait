import { LINK_TREE } from "../../utilities";

import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import TitledCard from "../../components/cards/TitledCard";

import RussianFederationMap from "../../components/charts/maps/RussianFederationMap";

import "./AdminGeographyView.scss";

function AdminGeographyView() {
    const regionData = [
        { name: "Москва", value: 95 },
        { name: "Санкт-Петербург", value: 88 },
        { name: "Московская область", value: 82 },
        { name: "Республика Татарстан", value: 75 },
        { name: "Свердловская область", value: 68 },
        { name: "Краснодарский край", value: 72 },
        { name: "Новосибирская область", value: 65 },
        { name: "Республика Башкортостан", value: 60 },
        { name: "Челябинская область", value: 58 },
        { name: "Самарская область", value: 55 },
        { name: "Красноярский край", value: 52 },
        { name: "Иркутская область", value: 48 },
        { name: "Хабаровский край", value: 45 },
        { name: "Приморский край", value: 44 },
        { name: "Республика Саха (Якутия)", value: 42 },
        { name: "Камчатский край", value: 38 },
        { name: "Тюменская область", value: 2048 }
    ];

    return (
        <div className="AdminGeographyView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Главная" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>География тестирования</h2>
                    <TitledCard title="Прохождение тестирования в РФ">
                        <RussianFederationMap
                            regionData={regionData}
                            visualMax={2048}
                        />
                    </TitledCard>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminGeographyView;
