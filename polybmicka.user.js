// ==UserScript==
// @name         PolyBMiCka - Polymarket Bitcoin Micro Cycle Monitor
// @namespace    https://github.com/mirdvorak/polybmicka
// @version      0.1.0
// @description  Monitors Bitcoin Up/Down 5-minute markets on Polymarket - Phase 1: observation only
// @author       Miroslav Dvorak
// @match        https://polymarket.com/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        window.onurlchange
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================================
    // CONFIG
    // =========================================================================
    const CONFIG = {
        SAMPLE_INTERVAL_MS: 100,
        TREND_WINDOW_MS: 10000,
        LOG_MAX_LINES: 100,
        URL_CHECK_INTERVAL_MS: 1000,
        DOM_RETRY_INTERVAL_MS: 500,
        DOM_RETRY_MAX: 60,
        VERSION: '0.3.2',

        // Trading rules
        MAX_BUY_AMOUNT: 1,              // max $1 per market
        MIN_PRICE_TO_BUY: 75,           // only buy if price > 75c
        MAX_REMAINING_SECS: 150,        // only buy if remaining time < 2:30 (150s)

        // Buy modes: 'OFF' | 'SIM' | 'LIVE'
        BUY_MODES: ['OFF', 'SIM', 'LIVE'],
    };

    // =========================================================================
    // LOGGER
    // =========================================================================
    const Logger = {
        _lines: [],
        _el: null,

        log(msg) {
            const ts = new Date().toLocaleTimeString('cs-CZ');
            const line = '[' + ts + '] ' + msg;
            console.log('[PolyBMiCka] ' + line);
            this._lines.push(line);
            if (this._lines.length > CONFIG.LOG_MAX_LINES) {
                this._lines.shift();
            }
            this._render();
        },

        _render() {
            if (!this._el) return;
            this._el.textContent = this._lines.join('\n');
            this._el.scrollTop = this._el.scrollHeight;
        },

        setElement(el) {
            this._el = el;
            this._render();
        },
    };

    // =========================================================================
    // PAGE ADAPTER - DOM selectors (all in one place for easy updates)
    // Based on actual Polymarket DOM structure (March 2026)
    //
    // Trading panel: div.bg-surface-1.shadow-md (width: 340px)
    // Outcome buttons container: div#outcome-buttons[role="radiogroup"]
    // Up button:   #outcome-buttons button.trading-button[value="0"]  (always value="0")
    // Down button: #outcome-buttons button.trading-button[value="1"]  (always value="1")
    //   - data-color changes: green/red = selected, gray = unselected
    //   - Price is in: button > span > span > p:nth-child(2) > span (contains "X\u00A2")
    //   - Label in:    button > span > span > p:nth-child(1) > span ("Up" or "Down")
    // Buy/Sell:    button[role="radio"][value="BUY"] / button[role="radio"][value="SELL"]
    // Amount:      input#market-order-amount-input
    // Submit btn:  button.trading-button[data-color="blue"] ("Buy Up"/"Buy Down"/"Sell Up"/"Sell Down")
    // =========================================================================
    const PageAdapter = {

        isBtc5minMarket() {
            return window.location.pathname.includes('/event/btc-updown-5m-');
        },

        isLiveMarket() {
            const goToLive = this.findGoToLiveMarketButton();
            return this.isBtc5minMarket() && !goToLive;
        },

        isHistoricalMarket() {
            const goToLive = this.findGoToLiveMarketButton();
            return this.isBtc5minMarket() && !!goToLive;
        },

        findGoToLiveMarketButton() {
            const allEls = document.querySelectorAll('a, button, div, span');
            for (const el of allEls) {
                if (el.textContent && el.textContent.includes('Go to live market')) {
                    return el;
                }
            }
            return null;
        },

        findTradingPanel() {
            // The trading panel is a div with bg-surface-1 class and shadow-md
            const panels = document.querySelectorAll('div.bg-surface-1');
            for (const p of panels) {
                if (p.classList.contains('shadow-md') || p.className.includes('shadow-md')) {
                    return p;
                }
            }
            // Fallback: look for the outcome-buttons container
            const outcomeDiv = document.getElementById('outcome-buttons');
            if (outcomeDiv) {
                return outcomeDiv.closest('div.bg-surface-1') || outcomeDiv.closest('div.shadow-md');
            }
            return null;
        },

        findUpDownButtons() {
            // Up is always value="0", Down is always value="1" in #outcome-buttons
            // data-color changes with selection (green/red/gray) so we cannot rely on it
            const container = document.getElementById('outcome-buttons');
            if (!container) {
                return { upBtn: null, downBtn: null };
            }
            const upBtn = container.querySelector('button.trading-button[value="0"]');
            const downBtn = container.querySelector('button.trading-button[value="1"]');
            return { upBtn, downBtn };
        },

        parsePrice(button) {
            // Price is inside the button in a span containing digits + cent sign
            // Structure: button > span.trading-button-text > span > p > span (with "Xc")
            // The price span has class ml-1.5 and contains text like "0c" or "51c"
            if (!button) return null;

            // Strategy 1: find all text nodes and look for the price pattern
            const allSpans = button.querySelectorAll('span');
            for (const span of allSpans) {
                const text = span.textContent.trim();
                // Match price like "0c", "51c", "98c" (with regular c or cent sign)
                const match = text.match(/^(\d+)\s*[c\u00A2]$/i);
                if (match) {
                    return parseInt(match[1], 10);
                }
            }

            // Strategy 2: get full button text and extract
            const fullText = button.textContent || '';
            const match = fullText.match(/(\d+)\s*[c\u00A2]/i);
            if (match) {
                return parseInt(match[1], 10);
            }

            return null;
        },

        readPrices() {
            const { upBtn, downBtn } = this.findUpDownButtons();
            const upPrice = this.parsePrice(upBtn);
            const downPrice = this.parsePrice(downBtn);
            return { upPrice, downPrice, upBtn, downBtn };
        },

        findBuySellTabs() {
            // Buy: button[role="radio"][value="BUY"]
            // Sell: button[role="radio"][value="SELL"]
            const buyTab = document.querySelector('button[role="radio"][value="BUY"]');
            const sellTab = document.querySelector('button[role="radio"][value="SELL"]');
            return { buyTab, sellTab };
        },

        findTradeButton() {
            // The submit/trade button: button.trading-button[data-color="blue"]
            return document.querySelector('button.trading-button[data-color="blue"]');
        },

        findAmountInput() {
            return document.getElementById('market-order-amount-input');
        },

        findQuickAmountButtons() {
            // +$1, +$5, +$10, +$100, Max buttons
            const buttons = [];
            const allBtns = document.querySelectorAll('button');
            for (const btn of allBtns) {
                const text = (btn.textContent || '').trim();
                if (/^\+\$\d+$/.test(text) || text === 'Max') {
                    buttons.push({ el: btn, label: text });
                }
            }
            return buttons;
        },

        getMarketTitle() {
            const h1 = document.querySelector('h1');
            if (h1) return h1.textContent.trim();
            return null;
        },

        getCurrentPrice() {
            const allEls = document.querySelectorAll('span, div, p');
            for (const el of allEls) {
                const text = (el.textContent || '').trim();
                if (text === 'Current price') {
                    const parent = el.parentElement;
                    if (parent) {
                        const priceText = parent.textContent.replace('Current price', '').trim();
                        const match = priceText.match(/\$[\d,]+\.?\d*/);
                        if (match) return match[0];
                    }
                }
            }
            return null;
        },

        getMarketResult() {
            // Determine winner by comparing "Price to beat" vs "Current price" BTC values
            // "Price to beat" = opening BTC price, "Current price" = live BTC price
            // If current >= beat => UP wins, else DOWN wins
            let priceToBeat = null;
            let currentPrice = null;

            const allSpans = document.querySelectorAll('span');
            for (const span of allSpans) {
                const text = (span.textContent || '').trim();
                if (text === 'Price to beat') {
                    // Next sibling or parent's next element has the dollar amount
                    const parent = span.closest('div');
                    if (parent) {
                        const priceSpan = parent.querySelector('span.text-heading-2xl, span[class*="heading"]');
                        if (priceSpan) {
                            const priceMatch = priceSpan.textContent.replace(/[,$\s]/g, '').match(/[\d.]+/);
                            if (priceMatch) priceToBeat = parseFloat(priceMatch[0]);
                        }
                    }
                }
                if (text === 'Current price') {
                    const parent = span.closest('div');
                    if (parent) {
                        // Current price uses number-flow-react component, read from textContent
                        const allNums = parent.querySelectorAll('number-flow-react, span.text-heading-2xl, span[class*="heading"]');
                        for (const numEl of allNums) {
                            const numText = numEl.textContent.replace(/[,$\s]/g, '').match(/[\d.]+/);
                            if (numText) {
                                currentPrice = parseFloat(numText[0]);
                                break;
                            }
                        }
                    }
                }
            }

            if (priceToBeat !== null && currentPrice !== null) {
                const winner = currentPrice >= priceToBeat ? 'UP' : 'DOWN';
                return { winner, priceToBeat, currentPrice };
            }

            return null;
        },

        getRemainingSeconds() {
            // Calculate remaining time from URL timestamp
            // URL: /event/btc-updown-5m-{startTimestamp}
            // Market ends 5 minutes after startTimestamp
            const tsMatch = window.location.pathname.match(/btc-updown-5m-(\d+)/);
            if (!tsMatch) return null;

            const startTs = parseInt(tsMatch[1], 10);
            const endTs = startTs + (5 * 60); // 5 minutes after start
            const nowTs = Math.floor(Date.now() / 1000);
            const remaining = endTs - nowTs;

            return remaining > 0 ? remaining : 0;
        },

        getRemainingMinutes() {
            const secs = this.getRemainingSeconds();
            if (secs === null) return null;
            return secs / 60;
        },
    };

    // =========================================================================
    // MARKET READER - samples prices over time
    // =========================================================================
    const MarketReader = {
        _samples: [],
        _intervalId: null,

        start() {
            if (this._intervalId) return;
            Logger.log('MarketReader: sampling started (' + CONFIG.SAMPLE_INTERVAL_MS + 'ms)');
            this._intervalId = setInterval(() => this._takeSample(), CONFIG.SAMPLE_INTERVAL_MS);
        },

        stop() {
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
                Logger.log('MarketReader: sampling stopped');
            }
        },

        _lastBtcResult: null,

        _takeSample() {
            const { upPrice, downPrice } = PageAdapter.readPrices();
            if (upPrice === null && downPrice === null) return;

            // Continuously track BTC prices for market result (before they reset on expiry)
            const btcResult = PageAdapter.getMarketResult();
            if (btcResult) {
                this._lastBtcResult = btcResult;
                Overlay.updateResolve(btcResult);
            }

            const sample = {
                ts: Date.now(),
                up: upPrice,
                down: downPrice,
            };

            this._samples.push(sample);

            // Trim old samples (keep last 60s worth)
            const cutoff = Date.now() - 60000;
            while (this._samples.length > 0 && this._samples[0].ts < cutoff) {
                this._samples.shift();
            }

            // Update timer
            const remainingSecs = PageAdapter.getRemainingSeconds();
            Overlay.updateTimer(remainingSecs);

            // Update UI
            Overlay.updatePrices(upPrice, downPrice);

            // Calculate trend
            const trend = TrendEngine.calculate(this._samples);
            Overlay.updateTrend(trend);

            // Buy logic: if mode is SIM or LIVE and signal fires
            const buyMode = Overlay.getBuyMode();
            if (trend.signal && buyMode !== 'OFF' && !ProfitTracker.getCurrentBuy()) {
                // Parse direction from signal
                const side = trend.signal.includes('BUY_UP') ? 'UP' : 'DOWN';
                const price = side === 'UP' ? upPrice : downPrice;
                if (price !== null) {
                    ProfitTracker.simulateBuy(side, price);
                }
            }

            // Detect market expiry: resolve sim trade
            if (remainingSecs !== null && remainingSecs <= 0 && ProfitTracker.getCurrentBuy()) {
                // Determine winner by comparing "Price to beat" vs "Current price"
                // If current BTC price >= price to beat => UP wins, else DOWN wins
                // Use live BTC result, or cached result from before expiry
                const result = PageAdapter.getMarketResult() || this._lastBtcResult;
                if (result) {
                    Logger.log('Market expired. ' + result.winner + ' wins (beat=$' + result.priceToBeat + ' curr=$' + result.currentPrice + ')');
                    ProfitTracker.resolveMarket(result.winner);
                } else {
                    // Last fallback: use button prices (unreliable after expiry)
                    const winSide = (upPrice !== null && downPrice !== null && upPrice > downPrice) ? 'UP' : 'DOWN';
                    Logger.log('Market expired (btn fallback). Winner: ' + winSide + ' (Up=' + upPrice + 'c, Down=' + downPrice + 'c)');
                    ProfitTracker.resolveMarket(winSide);
                }
            }
        },

        getSamples() {
            return this._samples;
        },

        getLatest() {
            if (this._samples.length === 0) return null;
            return this._samples[this._samples.length - 1];
        },
    };

    // =========================================================================
    // TREND ENGINE - analyzes price direction
    // =========================================================================
    const TrendEngine = {
        calculate(samples) {
            const now = Date.now();
            const windowStart = now - CONFIG.TREND_WINDOW_MS;
            const windowSamples = samples.filter(s => s.ts >= windowStart);

            if (windowSamples.length < 4) {
                return { direction: 'WAIT', strength: 0, message: 'Collecting data...' };
            }

            // Use UP price for trend analysis (could also track DOWN)
            const first = windowSamples[0];
            const last = windowSamples[windowSamples.length - 1];

            if (first.up === null || last.up === null) {
                return { direction: 'UNKNOWN', strength: 0, message: 'No price data' };
            }

            const change = last.up - first.up;
            const timeDelta = (last.ts - first.ts) / 1000; // seconds

            // Count consecutive same-direction moves
            let consecutive = 0;
            let lastDir = 0;
            for (let i = 1; i < windowSamples.length; i++) {
                if (windowSamples[i].up === null || windowSamples[i - 1].up === null) continue;
                const diff = windowSamples[i].up - windowSamples[i - 1].up;
                if (diff > 0) {
                    if (lastDir >= 0) consecutive++;
                    else consecutive = 1;
                    lastDir = 1;
                } else if (diff < 0) {
                    if (lastDir <= 0) consecutive++;
                    else consecutive = 1;
                    lastDir = -1;
                }
                // diff === 0: keep current streak
            }

            let direction = 'FLAT';
            if (change > 0) direction = 'UP';
            if (change < 0) direction = 'DOWN';

            const strength = Math.abs(change);

            const msg = direction + ' ' + (change > 0 ? '+' : '') + change + 'c in ' +
                        timeDelta.toFixed(1) + 's (streak: ' + consecutive + ')';

            return {
                direction,
                strength,
                change,
                timeDelta,
                consecutive,
                message: msg,
                // Simulated signal: would we buy?
                signal: this._evaluateSignal(direction, strength, consecutive),
            };
        },

        _evaluateSignal(direction, strength, consecutive) {
            // Phase 1: just show what we WOULD do, never act

            // Rule: only 1 buy per market - if we already have a position, no more signals
            if (ProfitTracker.getCurrentBuy()) {
                return null;
            }

            // Check trading rules
            const remainingMins = PageAdapter.getRemainingMinutes();
            const latest = MarketReader.getLatest();

            // Rule: only trade when < 2:30 remaining
            const remainingSecs = PageAdapter.getRemainingSeconds();
            if (remainingSecs === null || remainingSecs >= CONFIG.MAX_REMAINING_SECS) {
                return null; // too early, wait
            }

            // Determine which side has the higher price (the likely winner)
            const upPrice = latest ? latest.up : null;
            const downPrice = latest ? latest.down : null;

            // Rule: only buy if price > 75c (strong conviction side)
            if (direction === 'UP' && upPrice !== null && upPrice > CONFIG.MIN_PRICE_TO_BUY && consecutive >= 3) {
                return 'SIM_BUY_UP $' + CONFIG.MAX_BUY_AMOUNT + ' @ ' + upPrice + 'c (streak ' + consecutive + ', ' + Math.floor(remainingMins * 60) + 's left)';
            }
            if (direction === 'DOWN' && downPrice !== null && downPrice > CONFIG.MIN_PRICE_TO_BUY && consecutive >= 3) {
                return 'SIM_BUY_DOWN $' + CONFIG.MAX_BUY_AMOUNT + ' @ ' + downPrice + 'c (streak ' + consecutive + ', ' + Math.floor(remainingMins * 60) + 's left)';
            }

            return null;
        },
    };

    // =========================================================================
    // PROFIT TRACKER - simulated P&L tracking
    // =========================================================================
    const ProfitTracker = {
        _totalProfit: 0,
        _currentMarketBuy: null, // { side: 'UP'|'DOWN', price: 80, amount: 1, ts: ... }
        _trades: [],

        init() {
            this._totalProfit = GM_getValue('totalProfit', 0);
            this._trades = JSON.parse(GM_getValue('trades', '[]'));
            Logger.log('ProfitTracker: loaded profit $' + this._totalProfit.toFixed(2) + ' (' + this._trades.length + ' trades)');
        },

        simulateBuy(side, priceInCents) {
            if (this._currentMarketBuy) {
                Logger.log('ProfitTracker: already have open position, skip');
                return;
            }
            this._currentMarketBuy = {
                side: side,
                price: priceInCents,
                amount: CONFIG.MAX_BUY_AMOUNT,
                ts: Date.now(),
            };
            // cost = amount (shares cost = amount * price/100, but for $1 market order we get ~$1/price shares)
            // simplified: we pay $1, if we win we get $1*(100/price), profit = (100/price - 1)*$1
            const potentialWin = (100 / priceInCents) * this._currentMarketBuy.amount;
            const potentialProfit = potentialWin - this._currentMarketBuy.amount;
            Logger.log('SIM BUY ' + side + ' @ ' + priceInCents + 'c for $' + this._currentMarketBuy.amount + ' -> potential profit $' + potentialProfit.toFixed(2));
            Overlay.updateSimTrade(this._currentMarketBuy, potentialProfit);

            // Click +$1 on the Polymarket UI to show the amount visually
            this._simulateClickAmount();
        },

        _simulateClickAmount() {
            // First ensure Buy tab is active
            const { buyTab } = PageAdapter.findBuySellTabs();
            if (buyTab && buyTab.getAttribute('data-state') !== 'checked') {
                buyTab.click();
                Logger.log('Clicked Buy tab');
            }

            // Then click +$1 button (fast sequence for LIVE mode)
            setTimeout(() => {
                const quickBtns = PageAdapter.findQuickAmountButtons();
                const oneBtn = quickBtns.find(b => b.label === '+$1');
                if (oneBtn) {
                    oneBtn.el.click();
                    Logger.log('Clicked +$1 on Polymarket UI');

                    // LIVE MODE: immediately click the blue trade button
                    if (Overlay.getBuyMode() === 'LIVE') {
                        setTimeout(() => {
                            const tradeBtn = PageAdapter.findTradeButton();
                            if (tradeBtn) {
                                const tradeBtnText = tradeBtn.textContent.trim();
                                Logger.log('LIVE BUY: clicking "' + tradeBtnText + '"');
                                tradeBtn.click();
                                Logger.log('LIVE BUY: executed!');
                            } else {
                                Logger.log('LIVE BUY ERROR: trade button not found!');
                            }
                        }, 50);
                    }
                } else {
                    Logger.log('WARNING: +$1 button not found on page');
                }
            }, 50);
        },

        resolveMarket(winningSide) {
            // Called when market expires - check if our simulated buy was correct
            if (!this._currentMarketBuy) return;

            const buy = this._currentMarketBuy;
            let profit = 0;

            if (buy.side === winningSide) {
                // Win: we paid $amount, we get $amount * (100/price)
                const payout = (100 / buy.price) * buy.amount;
                profit = payout - buy.amount;
                Logger.log('SIM WIN! ' + buy.side + ' @ ' + buy.price + 'c -> payout $' + payout.toFixed(2) + ', profit +$' + profit.toFixed(2));
            } else {
                // Lose: we lose $amount
                profit = -buy.amount;
                Logger.log('SIM LOSE. ' + buy.side + ' @ ' + buy.price + 'c -> lost $' + buy.amount);
            }

            this._totalProfit += profit;
            GM_setValue('totalProfit', this._totalProfit);

            this._trades.push({
                side: buy.side,
                price: buy.price,
                profit: profit,
                ts: buy.ts,
                resolved: Date.now(),
            });
            GM_setValue('trades', JSON.stringify(this._trades));

            this._currentMarketBuy = null;
            Overlay.updateProfit(this._totalProfit);
            Overlay.updateSimTrade(null, 0);
        },

        getProfit() {
            return this._totalProfit;
        },

        getCurrentBuy() {
            return this._currentMarketBuy;
        },

        resetProfit() {
            this._totalProfit = 0;
            this._trades = [];
            this._currentMarketBuy = null;
            GM_setValue('totalProfit', 0);
            GM_setValue('trades', '[]');
            Logger.log('ProfitTracker: reset to $0');
        },
    };

    // =========================================================================
    // OVERLAY UI
    // =========================================================================
    const Overlay = {
        _container: null,
        _enabled: false,
        _buyMode: 'OFF', // 'OFF' | 'SIM' | 'LIVE'
        _elements: {},

        init() {
            if (this._container) return;

            this._enabled = GM_getValue('enabled', false);

            const container = document.createElement('div');
            container.id = 'polybmicka-overlay';
            container.style.cssText = [
                'position: fixed',
                'top: 80px',
                'right: 10px',
                'width: 280px',
                'background: #1a1a2e',
                'color: #e0e0e0',
                'border: 1px solid #333',
                'border-radius: 8px',
                'padding: 12px',
                'font-family: monospace',
                'font-size: 12px',
                'z-index: 99999',
                'box-shadow: 0 4px 12px rgba(0,0,0,0.5)',
                'user-select: none',
            ].join('; ');

            // Header
            const header = document.createElement('div');
            header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:6px;';
            header.innerHTML = '<span style="font-weight:bold; color:#00ff88;">PolyBMiCka v' + CONFIG.VERSION + '</span>';

            // Toggle button
            const toggleBtn = document.createElement('button');
            toggleBtn.style.cssText = 'padding:2px 10px; border:1px solid #555; border-radius:4px; cursor:pointer; font-size:11px; font-family:monospace;';
            this._updateToggleBtn(toggleBtn);
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._enabled = !this._enabled;
                GM_setValue('enabled', this._enabled);
                this._updateToggleBtn(toggleBtn);
                if (this._enabled) {
                    App.startMonitoring();
                } else {
                    App.stopMonitoring();
                }
            });
            header.appendChild(toggleBtn);
            container.appendChild(header);

            // Status line
            const status = document.createElement('div');
            status.id = 'pbm-status';
            status.style.cssText = 'margin-bottom:6px; color:#888;';
            status.textContent = 'Status: initializing...';
            container.appendChild(status);
            this._elements.status = status;

            // Market info
            const marketInfo = document.createElement('div');
            marketInfo.id = 'pbm-market';
            marketInfo.style.cssText = 'margin-bottom:6px; color:#aaa;';
            marketInfo.textContent = 'Market: --';
            container.appendChild(marketInfo);
            this._elements.market = marketInfo;

            // Market resolve prediction
            const resolveRow = document.createElement('div');
            resolveRow.id = 'pbm-resolve';
            resolveRow.style.cssText = 'margin-bottom:6px; padding:4px; background:#111; border-radius:4px; font-weight:bold; font-size:13px; text-align:center;';
            resolveRow.textContent = 'Will resolve: --';
            container.appendChild(resolveRow);
            this._elements.resolve = resolveRow;

            // Timer + Rules row
            const timerRow = document.createElement('div');
            timerRow.id = 'pbm-timer';
            timerRow.style.cssText = 'margin-bottom:6px; padding:4px; background:#111; border-radius:4px; display:flex; justify-content:space-between;';
            timerRow.innerHTML = '<span>Time left: --</span><span style="color:#666;">Rules: >' + CONFIG.MIN_PRICE_TO_BUY + 'c, <' + Math.floor(CONFIG.MAX_REMAINING_SECS / 60) + ':' + String(CONFIG.MAX_REMAINING_SECS % 60).padStart(2, '0') + ', $' + CONFIG.MAX_BUY_AMOUNT + '</span>';
            container.appendChild(timerRow);
            this._elements.timer = timerRow;

            // Prices row
            const pricesRow = document.createElement('div');
            pricesRow.style.cssText = 'display:flex; gap:12px; margin-bottom:6px;';

            const upPrice = document.createElement('span');
            upPrice.id = 'pbm-up';
            upPrice.style.cssText = 'color:#00cc66; font-weight:bold;';
            upPrice.textContent = 'UP: --';
            pricesRow.appendChild(upPrice);
            this._elements.upPrice = upPrice;

            const downPrice = document.createElement('span');
            downPrice.id = 'pbm-down';
            downPrice.style.cssText = 'color:#ff4444; font-weight:bold;';
            downPrice.textContent = 'DOWN: --';
            pricesRow.appendChild(downPrice);
            this._elements.downPrice = downPrice;

            container.appendChild(pricesRow);

            // Trend line
            const trend = document.createElement('div');
            trend.id = 'pbm-trend';
            trend.style.cssText = 'margin-bottom:6px; padding:4px; background:#111; border-radius:4px;';
            trend.textContent = 'Trend: --';
            container.appendChild(trend);
            this._elements.trend = trend;

            // Signal line
            const signal = document.createElement('div');
            signal.id = 'pbm-signal';
            signal.style.cssText = 'margin-bottom:6px; padding:4px; background:#111; border-radius:4px; color:#ffcc00;';
            signal.textContent = 'Signal: none';
            container.appendChild(signal);
            this._elements.signal = signal;

            // BUY ENABLE button row
            const buyRow = document.createElement('div');
            buyRow.style.cssText = 'display:flex; gap:6px; margin-bottom:6px; align-items:center;';

            this._buyMode = GM_getValue('buyMode', 'OFF');
            const buyBtn = document.createElement('button');
            buyBtn.style.cssText = 'padding:3px 12px; border:1px solid #555; border-radius:4px; cursor:pointer; font-size:11px; font-family:monospace; flex:1;';
            this._updateBuyBtn(buyBtn);
            buyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const modes = CONFIG.BUY_MODES;
                const idx = modes.indexOf(this._buyMode);
                this._buyMode = modes[(idx + 1) % modes.length];
                GM_setValue('buyMode', this._buyMode);
                this._updateBuyBtn(buyBtn);
                Logger.log('Buy mode: ' + this._buyMode);
            });
            buyRow.appendChild(buyBtn);
            this._elements.buyBtn = buyBtn;
            container.appendChild(buyRow);

            // Sim trade info row
            const simTrade = document.createElement('div');
            simTrade.id = 'pbm-simtrade';
            simTrade.style.cssText = 'margin-bottom:6px; padding:4px; background:#1a0a2e; border:1px solid #444; border-radius:4px; color:#aaa; font-size:11px;';
            simTrade.textContent = 'Sim: no position';
            container.appendChild(simTrade);
            this._elements.simTrade = simTrade;

            // Profit row with CLEAR button
            const profitWrapper = document.createElement('div');
            profitWrapper.style.cssText = 'display:flex; gap:4px; margin-bottom:6px; align-items:stretch;';

            const profitRow = document.createElement('div');
            profitRow.id = 'pbm-profit';
            profitRow.style.cssText = 'flex:1; padding:4px; background:#0a1a0e; border:1px solid #444; border-radius:4px; font-weight:bold; font-size:13px;';
            profitRow.textContent = 'Profit: $' + ProfitTracker.getProfit().toFixed(2);
            profitWrapper.appendChild(profitRow);
            this._elements.profit = profitRow;

            const clearBtn = document.createElement('button');
            clearBtn.style.cssText = 'padding:2px 6px; border:1px solid #555; border-radius:4px; cursor:pointer; font-size:9px; font-family:monospace; background:#333; color:#888;';
            clearBtn.textContent = 'CLR';
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                ProfitTracker.resetProfit();
                this.updateProfit(0);
            });
            profitWrapper.appendChild(clearBtn);

            container.appendChild(profitWrapper);

            // Log area
            const logLabel = document.createElement('div');
            logLabel.style.cssText = 'color:#666; font-size:10px; margin-bottom:2px;';
            logLabel.textContent = 'Log:';
            container.appendChild(logLabel);

            const logArea = document.createElement('pre');
            logArea.style.cssText = [
                'height: 45vh',
                'overflow-y: auto',
                'background: #111',
                'padding: 4px',
                'border-radius: 4px',
                'font-size: 10px',
                'color: #888',
                'margin: 0',
                'white-space: pre-wrap',
                'word-break: break-all',
            ].join('; ');
            container.appendChild(logArea);
            Logger.setElement(logArea);

            document.body.appendChild(container);
            this._container = container;

            Logger.log('Overlay initialized');
        },

        _updateToggleBtn(btn) {
            if (this._enabled) {
                btn.textContent = 'ON';
                btn.style.background = '#00cc66';
                btn.style.color = '#000';
            } else {
                btn.textContent = 'OFF';
                btn.style.background = '#333';
                btn.style.color = '#888';
            }
        },

        updateStatus(text) {
            if (this._elements.status) {
                this._elements.status.textContent = 'Status: ' + text;
            }
        },

        updateMarket(text) {
            if (this._elements.market) {
                this._elements.market.textContent = 'Market: ' + text;
            }
        },

        updateTimer(remainingSecs) {
            if (!this._elements.timer) return;
            const timerSpan = this._elements.timer.querySelector('span');
            if (!timerSpan) return;

            if (remainingSecs === null) {
                timerSpan.textContent = 'Time left: --';
                timerSpan.style.color = '#888';
                return;
            }

            const mins = Math.floor(remainingSecs / 60);
            const secs = remainingSecs % 60;
            const timeStr = mins + ':' + String(secs).padStart(2, '0');

            if (remainingSecs <= 0) {
                timerSpan.textContent = 'EXPIRED';
                timerSpan.style.color = '#ff4444';
            } else if (remainingSecs <= CONFIG.MAX_REMAINING_SECS) {
                timerSpan.textContent = 'Time: ' + timeStr + ' HOT';
                timerSpan.style.color = '#ff8800';
            } else {
                timerSpan.textContent = 'Time: ' + timeStr;
                timerSpan.style.color = '#888';
            }
        },

        updatePrices(up, down) {
            if (this._elements.upPrice) {
                this._elements.upPrice.textContent = 'UP: ' + (up !== null ? up + 'c' : '--');
            }
            if (this._elements.downPrice) {
                this._elements.downPrice.textContent = 'DOWN: ' + (down !== null ? down + 'c' : '--');
            }
        },

        _lastSignal: null,

        updateTrend(trend) {
            if (this._elements.trend) {
                let color = '#888';
                if (trend.direction === 'UP') color = '#00cc66';
                if (trend.direction === 'DOWN') color = '#ff4444';
                if (trend.direction === 'FLAT') color = '#888';
                this._elements.trend.style.color = color;
                this._elements.trend.textContent = 'Trend: ' + trend.message;
            }
            if (this._elements.signal) {
                if (trend.signal) {
                    this._elements.signal.textContent = 'Signal: ' + trend.signal;
                    this._elements.signal.style.color = '#ffcc00';
                    // Only log when signal changes (deduplicate at 100ms sampling)
                    if (this._lastSignal !== trend.signal) {
                        Logger.log('SIGNAL: ' + trend.signal);
                        this._lastSignal = trend.signal;
                    }
                } else {
                    this._elements.signal.textContent = 'Signal: none';
                    this._elements.signal.style.color = '#666';
                    if (this._lastSignal !== null) {
                        this._lastSignal = null;
                    }
                }
            }
        },

        _updateBuyBtn(btn) {
            if (this._buyMode === 'LIVE') {
                btn.textContent = 'BUY: LIVE';
                btn.style.background = '#cc0000';
                btn.style.color = '#fff';
            } else if (this._buyMode === 'SIM') {
                btn.textContent = 'BUY: SIM';
                btn.style.background = '#cc8800';
                btn.style.color = '#000';
            } else {
                btn.textContent = 'BUY: OFF';
                btn.style.background = '#222';
                btn.style.color = '#666';
            }
        },

        updateSimTrade(buy, potentialProfit) {
            if (!this._elements.simTrade) return;
            if (!buy) {
                this._elements.simTrade.textContent = 'Sim: no position';
                this._elements.simTrade.style.color = '#aaa';
                return;
            }
            this._elements.simTrade.textContent = 'Sim: ' + buy.side + ' @ ' + buy.price + 'c $' + buy.amount + ' -> pot. +$' + potentialProfit.toFixed(2);
            this._elements.simTrade.style.color = '#ffcc00';
        },

        updateResolve(result) {
            if (!this._elements.resolve) return;
            if (!result) {
                this._elements.resolve.textContent = 'Will resolve: --';
                this._elements.resolve.style.color = '#888';
                return;
            }
            const color = result.winner === 'UP' ? '#00cc66' : '#ff4444';
            this._elements.resolve.style.color = color;
            this._elements.resolve.textContent = 'Will resolve: ' + result.winner + ' ($' + result.currentPrice.toFixed(2) + ' vs $' + result.priceToBeat.toFixed(2) + ')';
        },

        updateProfit(total) {
            if (!this._elements.profit) return;
            const color = total >= 0 ? '#00cc66' : '#ff4444';
            this._elements.profit.textContent = 'Profit from PolyBMiCka: $' + total.toFixed(2);
            this._elements.profit.style.color = color;
        },

        isEnabled() {
            return this._enabled;
        },

        getBuyMode() {
            return this._buyMode;
        },

        destroy() {
            if (this._container) {
                this._container.remove();
                this._container = null;
            }
        },
    };

    // =========================================================================
    // APP - main controller
    // =========================================================================
    const App = {
        _urlCheckId: null,
        _lastUrl: null,
        _domRetryCount: 0,
        _domRetryId: null,

        init() {
            Logger.log('PolyBMiCka v' + CONFIG.VERSION + ' starting...');
            ProfitTracker.init();
            Overlay.init();
            Overlay.updateProfit(ProfitTracker.getProfit());

            // Register Tampermonkey menu command
            GM_registerMenuCommand('PolyBMiCka Toggle', () => {
                const btn = document.querySelector('#polybmicka-overlay button');
                if (btn) btn.click();
            });

            // Start URL monitoring
            this._lastUrl = window.location.href;
            this._checkPage();

            // Listen for SPA navigation
            if (window.onurlchange === null) {
                window.addEventListener('urlchange', () => {
                    Logger.log('URL changed: ' + window.location.pathname);
                    this._checkPage();
                });
                Logger.log('urlchange listener registered');
            } else {
                // Fallback: poll URL
                this._urlCheckId = setInterval(() => {
                    if (window.location.href !== this._lastUrl) {
                        this._lastUrl = window.location.href;
                        Logger.log('URL changed (poll): ' + window.location.pathname);
                        this._checkPage();
                    }
                }, CONFIG.URL_CHECK_INTERVAL_MS);
                Logger.log('URL polling fallback started');
            }
        },

        _checkPage() {
            this._lastUrl = window.location.href;

            if (!PageAdapter.isBtc5minMarket()) {
                Overlay.updateStatus('Not a BTC 5min market');
                Overlay.updateMarket(window.location.pathname);
                this.stopMonitoring();
                return;
            }

            // Extract timestamp from URL for display
            const tsMatch = window.location.pathname.match(/btc-updown-5m-(\d+)/);
            const ts = tsMatch ? new Date(parseInt(tsMatch[1], 10) * 1000) : null;
            const timeStr = ts ? ts.toLocaleTimeString('cs-CZ') : '?';

            // Wait for DOM to be ready with Up/Down buttons
            this._domRetryCount = 0;
            this._waitForTradingPanel(timeStr);
        },

        _waitForTradingPanel(timeStr) {
            if (this._domRetryId) {
                clearInterval(this._domRetryId);
            }

            this._domRetryId = setInterval(() => {
                this._domRetryCount++;

                // Check for historical market
                const goToLive = PageAdapter.findGoToLiveMarketButton();
                if (goToLive) {
                    clearInterval(this._domRetryId);
                    Overlay.updateStatus('Historical market - click "Go to live market"');
                    Overlay.updateMarket('Historical @ ' + timeStr);
                    Logger.log('Historical market detected');
                    return;
                }

                // Check for live market with buttons
                const { upBtn, downBtn } = PageAdapter.findUpDownButtons();
                if (upBtn || downBtn) {
                    clearInterval(this._domRetryId);
                    Overlay.updateStatus('Live market found!');
                    Overlay.updateMarket('BTC 5min @ ' + timeStr);
                    Logger.log('Live market detected @ ' + timeStr);

                    // Auto-start if enabled
                    if (Overlay.isEnabled()) {
                        this.startMonitoring();
                    } else {
                        Overlay.updateStatus('Ready - toggle ON to start monitoring');
                    }
                    return;
                }

                // Timeout
                if (this._domRetryCount >= CONFIG.DOM_RETRY_MAX) {
                    clearInterval(this._domRetryId);
                    Overlay.updateStatus('Trading panel not found (timeout)');
                    Logger.log('DOM timeout - trading panel not found after ' + CONFIG.DOM_RETRY_MAX + ' retries');
                }
            }, CONFIG.DOM_RETRY_INTERVAL_MS);
        },

        startMonitoring() {
            Logger.log('Monitoring started');
            Overlay.updateStatus('MONITORING');
            MarketReader.start();
        },

        stopMonitoring() {
            Logger.log('Monitoring stopped');
            Overlay.updateStatus('Stopped');
            MarketReader.stop();
        },
    };

    // =========================================================================
    // BOOTSTRAP
    // =========================================================================
    // Wait a moment for the SPA to initialize, then start
    setTimeout(() => App.init(), 1500);

})();
