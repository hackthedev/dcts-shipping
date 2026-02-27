import fs from "fs";
import {ChartJSNodeCanvas} from "chartjs-node-canvas";
import {getChannelMessageFrequency, getChannelRateLimit} from "./messages.mjs";
import path from "path";
import {serverconfig} from "../../../index.mjs";

// This was mostly AI, like 90% or smth.
// Why? Cauz im too lazy to deal with boring shit like this
// and it was mostly for testing.
//
// If you dont like it, go fuck yourself, respectfully  ¯\_(ツ)_/¯

export async function renderRoomCharts(room){
    const { rows, hourlyBaseline, dailyAverage, hourlyAverage, currentHourlyAverage } = await getChannelMessageFrequency({ room });
    const status = await getChannelRateLimit(room);

    let dailyPath = path.join(path.resolve(), "public", "graphs", `${room}_daily.png`);
    let hourlyPath = path.join(path.resolve(), "public", "graphs", `${room}_hourly.png`);

    let userSlowModeMultiplier = serverconfig.serverinfo.moderation.ratelimit.actions.user_slowmode
    let rateLimitMultiplier = serverconfig.serverinfo.moderation.ratelimit.actions.ratelimit

    // daily shit
    await renderChart({
        xLabels: rows.map(r => r.day),
        yValues: rows.map(r => r.messages),
        xLabel: "Day",
        yLabel: "Average Messages",
        label: "messages / day",
        lines: [
            { value: dailyAverage, label: "Baseline", color: "rgba(255,234,0,0.9)" },
            { value: dailyAverage * userSlowModeMultiplier, label: "User Specific Slowmode", color: "rgba(255,98,0,0.9)" },
            { value: dailyAverage * rateLimitMultiplier, label: "Rate Limit", color: "rgba(255, 0, 0, 0.9)" },
            { value: status.currentDaily, label: "Current", color: "rgba(0,255,255,0.9)" }
        ]
    }, dailyPath);

    // hourly shit
    const hours = [...hourlyBaseline.keys()];
    const avgValues = [...hourlyBaseline.values()];

    await renderChart({
        xLabels: hours.map(h => `${h}:00`),
        yValues: avgValues,
        xLabel: "Time",
        yLabel: "Average Messages",
        label: "avg messages / hour",
        lines: [
            { value: hourlyAverage, label: "Baseline", color: "rgba(255,234,0,0.9)" },
            { value: hourlyAverage * userSlowModeMultiplier, label: "User Specific Slowmode", color: "rgba(255,98,0,0.9)" },
            { value: hourlyAverage * rateLimitMultiplier, label: "Rate Limit", color: "rgba(255, 0, 0, 0.9)" },
            { value: status.currentHourly, label: "Current", color: "rgba(0,255,255,0.9)" }
        ]
    }, hourlyPath);

    return {
        daily: dailyPath.replace(path.join(path.resolve(), "public"), "").replaceAll("\\", "/"),
        hourly: hourlyPath.replace(path.join(path.resolve(), "public"), "").replaceAll("\\", "/"),
    }
}

export async function renderChart({
                                      xLabels,
                                      yValues,
                                      xLabel = "",
                                      yLabel = "",
                                      label = "",
                                      backgroundColor = "transparent",
                                      lines = [],
                                      width = 800,
                                      height = 400
                                  }, outPath) {

    // might turn that shit into a setting or work with the theme system.
    const defaultColors = {
        bar: "rgba(54, 162, 235, 0.8)",
        barBorder: "rgba(54, 162, 235, 1)",
        lines: [
            "rgba(255, 65, 54, 0.9)",
            "rgba(255, 176, 0, 0.9)",
            "rgba(46, 204, 113, 0.9)",
            "rgba(155, 89, 182, 0.9)"
        ]
    };

    // same here
    const lineLabelPlugin = {
        id: "lineLabels",
        afterDraw(chart) {
            const ctx = chart.ctx;
            chart.data.datasets.forEach((ds, i) => {
                if (ds.type !== "line") return;
                const meta = chart.getDatasetMeta(i);
                if (!meta.data || meta.data.length === 0) return;

                const point = meta.data[0];
                ctx.save();
                ctx.font = "bold 12px sans-serif";
                ctx.fillStyle = ds.borderColor || "#000";
                ctx.font = "bold 12px sans-serif";
                ctx.fillText(ds.label, point.x, point.y - 8);
                ctx.restore();
            });
        }
    };

    // self explanatory
    const canvas = new ChartJSNodeCanvas({width, height});
    const datasets = [{
        label,
        data: yValues,
        type: "bar",
        backgroundColor: defaultColors.bar,
        borderColor: defaultColors.barBorder,
        borderWidth: 1,
        order: 0,
    }];
    //
    lines.forEach((line, i) => {
        datasets.push({
            label: line.label || `line ${i + 1}`,
            data: Array(xLabels.length).fill(line.value),
            type: "line",
            borderColor: line.color || defaultColors.lines[i % defaultColors.lines.length],
            borderDash: line.dash || [6, 4],
            borderWidth: line.width || 2,
            pointRadius: 0,
            order: 1,
            fill: false
        });
    });

    // create n write that shit into a fockin file dude
    const buffer = await canvas.renderToBuffer({
        type: "bar",
        data: {
            labels: xLabels,
            datasets
        },
        options: {
            plugins: {
                legend: {display: true},
                customCanvasBackgroundColor: {color: backgroundColor}
            },
            scales: {
                x: {
                    type: "category",
                    title: {display: !!xLabel, text: xLabel},
                    ticks: {autoSkip: false}
                },
                y: {
                    beginAtZero: true,
                    title: {display: !!yLabel, text: yLabel}
                }
            }
        },
        plugins: [lineLabelPlugin, {
            id: "customCanvasBackgroundColor",
            beforeDraw(chart) {
                const ctx = chart.ctx;
                ctx.save();
                ctx.globalCompositeOperation = "destinationOver";
                ctx.fillStyle = chart.config.options.plugins.customCanvasBackgroundColor?.color || "transparent";
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }]
    });

    fs.writeFileSync(outPath, buffer);
}