import Chart from "react-apexcharts";
import { CATEGORIES_DESCRIPTIONS } from "../../utilities";
import "./RadarChart.scss";

function RadarChart({title, seriesLabel, seriesData, categories, competencyKeys, height = 450}) {
    // Функция для форматирования подписей с переносами
    const formatCategoryLabels = (categories) => {
        return categories.map(category => {
            const words = category.split(' ');
            
            // Если одно длинное слово — разбиваем по символам
            if (words.length === 1 && category.length > 12) {
                const mid = Math.ceil(category.length / 2);
                return [category.slice(0, mid) + '-', category.slice(mid)];
            }
            
            // Если несколько слов — разбиваем на строки
            if (words.length > 2) {
                const mid = Math.ceil(words.length / 2);
                return [
                    words.slice(0, mid).join(' '),
                    words.slice(mid).join(' ')
                ];
            }

            // Если два слова и суммарно длинные — тоже разбиваем
            if (words.length === 2 && category.length > 14) {
                return [words[0], words[1]];
            }

            return category;
        });
    };

    const formattedCategories = formatCategoryLabels(categories);

    const pushRadarLabels = (el) => {
        const labels = el.querySelectorAll('.apexcharts-xaxis-label');
        const svgEl = el.querySelector('svg');
        if (!labels.length || !svgEl) return;

        const svgOrigin = svgEl.getBoundingClientRect();
        const cx = svgOrigin.width / 2;
        const cy = svgOrigin.height / 2;
        const PUSH = 20;

        labels.forEach(label => {
            const rect = label.getBoundingClientRect();

            const lx = rect.left - svgOrigin.left + rect.width / 2;
            const ly = rect.top - svgOrigin.top + rect.height / 2;

            const dx = lx - cx;
            const dy = ly - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return;

            // Учитываем размер лейбла — компенсируем "овальность"
            const labelHalfW = rect.width / 2;
            const labelHalfH = rect.height / 2;
            const labelRadius = Math.sqrt(labelHalfW * labelHalfW + labelHalfH * labelHalfH);

            // Нормализуем вектор и добавляем PUSH + компенсацию размера лейбла
            const nx = dx / dist;
            const ny = dy / dist;

            // Компенсация: вычитаем проекцию размера лейбла на направление
            const compensation = Math.abs(nx * labelHalfW) + Math.abs(ny * labelHalfH);
            const totalPush = PUSH - compensation + labelRadius * 0.5;

            const ox = nx * totalPush;
            const oy = ny * totalPush;

            const current = label.getAttribute('transform') || '';
            const clean = current.replace(/translate\([^)]*\)/, '').trim();
            label.setAttribute('transform', `${clean} translate(${ox}, ${oy})`);
        });
    };

    const chartOptions = {
        chart: {
            type: 'radar',
            toolbar: { show: false },
            dropShadow: { enabled: true, blur: 1, left: 1, top: 1 },
            width: '100%',
            events: {
                mounted: function(chartCtx) {
                    pushRadarLabels(chartCtx.el);
                },
                updated: function(chartCtx) {
                    pushRadarLabels(chartCtx.el);
                }
            }
        },
        title: {
            text: title,
            align: 'center',
            style: { fontSize: '14px', fontWeight: 'bold' }
        },
        xaxis: {
            categories: formattedCategories,
            labels: {
                style: { 
                    fontSize: '12px',
                    fontWeight: 500,
                    colors: '#111111'
                }
            }
        },
        yaxis: {
            min: 200,
            max: 800,
            tickAmount: 3,
            labels: {
                formatter: function(val) { return val; },
                style: {
                    fontSize: '11px'
                }
            }
        },
        plotOptions: {
            radar: {
                size: (() => {
                    if (categories.length > 8) return 130;
                    const hasLongLabels = categories.some(c => c.length > 10);
                    return hasLongLabels ? 130 : 140;
                })(),
                polygons: {
                    connectorColors: '#BDBDBD',
                    fill: { colors: ['#A5D6A7', '#C8E6C9', '#FFF9C4'] }
                }
            }
        },
        tooltip: {
            custom: function({ series, seriesIndex, dataPointIndex, w }) {
                const formatDescription = (description) => {
                    if (!description) return '';
                    
                    // Разбиваем описание на строки по 50 символов
                    const words = description.split(' ');
                    const lines = [];
                    let currentLine = '';
                    
                    words.forEach(word => {
                        if ((currentLine + ' ' + word).length > 44) {
                            if (currentLine) lines.push(currentLine);
                            currentLine = word;
                        } else {
                            currentLine = currentLine ? currentLine + ' ' + word : word;
                        }
                    });
                    if (currentLine) lines.push(currentLine);
                    
                    return lines.join('<br>');
                };

                const value = series[seriesIndex][dataPointIndex];
                const category = value < 400 ? 'низкий' : value < 600 ? 'средний' : 'высокий';
                const color = value < 400 ? '#e0cf30ff' : value < 600 ? '#c3da45ff' : '#219b25ff';
                const originalLabel = categories[dataPointIndex];
                
                // описание компетенции
                const competencyKey = competencyKeys && competencyKeys[dataPointIndex];
                const description = competencyKey ? CATEGORIES_DESCRIPTIONS[competencyKey] : null;
                console.log(competencyKey)
                
                let tooltipHTML = `
                    <div class="custom-tooltip">
                        <strong>${originalLabel}</strong><br>
                        Значение: <span style="color:${color}">${value}</span> из 800<br>
                        Категория: <span style="color:${color}">${category}</span> результат
                `;
                
                if (description) {
                    const formattedDescription = formatDescription(description);
                    tooltipHTML += (
                        `<br>
                        <div style="margin-top: 8px; font-size: 13px; color: #666; max-width: 300px; line-height: 1.3;">
                            ${formattedDescription}
                        </div>`
                    );
                }
                
                tooltipHTML += `</div>`;
                return tooltipHTML;
            }
        }
    };

    const chartSeries = [{
        name: seriesLabel,
        data: seriesData
    }];

    return (
        <div className="RadarChart" style={{ width: '100%' }}>
            <Chart
                options={chartOptions}
                series={chartSeries}
                type="radar"
                height={height}
                width="100%"
            />
        </div>
    );
}

export default RadarChart;
