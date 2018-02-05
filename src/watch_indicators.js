const fetch = require("node-fetch");
const ti = require('technicalindicators');
const ccxt = require('ccxt');
const https = require('https');

rangeMin = 260;
async function getAsJson(url) {
  const response = await fetch(url);
  const json = await response.json();
  return json;
};
function sleep(time) {
  const d1 = new Date();
  while (true) {
    const d2 = new Date();
    if (d2 - d1 > time) {
      return;
    }
  }
}

const macdInput = {
  values : null,
  fastPeriod : 50,
  slowPeriod : 80,
  signalPeriod : 30,
  SimpleMAOscillator: false,
  SimpleMASignal: false
};

const MACD = ti.MACD;
const BB = ti.BollingerBands;

const id = 'bitflyer';
const symbol = 'BTC/JPY';

const patternMap = {
  'IHS' : '逆三尊(↑)',
  'HS' : '三尊(↓)',
  'TU' : '上昇トレンド(↑)',
  'TD' : '下降トレンド(↓)',
  'DT' : 'ダブルトップ(↓)',
  'DB' : 'ダブルボトム(↑)'
};

(async function main () {
  // 余裕が出たらOHLCVも使いたい
  // const index = 4 // [ timestamp, open, high, low, close, volume ]
  //const ohlcv = await new ccxt.bitfinex ().fetchOHLCV ('BTC/USD', '1m');
  //const ohlcv = await getAsJson('https://min-api.cryptocompare.com/data/histominute?fsym=BTC&tsym=JPY&e=bitFlyerFX');

  let series = []; // ohlcv.Data.slice(-rangeMin).map(x => x.close)  // closing price
  const exchange = new ccxt[id] ({ enableRateLimit: true });

  while(true) {
    // update series
    const ticker = await exchange.fetchTicker(symbol).catch((e) => {
      console.log(e);
      sleep(10000);
    });
    series.push(ticker.bid)
    series = series.slice(-rangeMin);

    // show indicators

    macdInput.values = series;
    const macd = MACD.calculate(macdInput);
    const macdLatest = macd.slice(-1)[0];
    const sma = ti.SMA.calculate({period : 10, values : series});
    const bb = BB.calculate({period : 60, values : series, stdDev: 2});
    const bbLatest = bb.slice(-1)[0];
    // console.log(ccxt.omit (ticker, 'info'));
    // 必要そうな情報をLTSVで出力
    process.stdout.write(`bid:${ticker.bid}\task:${ticker.ask}\tlast:${ticker.last}\ttime:${ticker.datetime}\tvolume:${ticker.baseVolume}`)
    if (macdLatest) {
      const pattern = await ti.predictPattern({ values : macd.map((v) => v.MACD) })
      process.stdout.write(`\tpattern:${patternMap[pattern.pattern]}\tpatternId:${pattern.patternId}\tprob:${pattern.probability}`);
      process.stdout.write(`\thist:${macdLatest.histogram}\tmacd:${macdLatest.MACD}\tsignal:${macdLatest.signal}`);
    }
    if (bbLatest) {
      process.stdout.write(`\tbbLower:${bbLatest.lower}\tbbMiddle:${bbLatest.middle}\tbbUpper:${bbLatest.upper}`);
    }
    console.log(`\tsma:${sma.slice(-1)[0]}`);
  }

})();

