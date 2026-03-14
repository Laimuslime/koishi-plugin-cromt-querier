export interface XingruoData {
  title: string;
  writer: string;
  score: string;
  number: string;
  say: string;
  link: string;
  type: string;
}

export interface XingruoResponse {
  code: number;
  message: string;
  search: string;
  data: XingruoData;
}

export interface XingruoRankData {
  rank: string;
  head: string;
  name: string;
  total: string;
  average: string;
  pages: string;
  crawl_time: string;
}

export interface XingruoRankResponse {
  code: number;
  message: string;
  search: string;
  total: number;
  data: XingruoRankData[];
}

export interface XingruoQuerierTable {
  id?: number;
  platform: string;
  channelId: string;
  defaultType: string;
}