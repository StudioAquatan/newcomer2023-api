export interface NewtImage {
  src: string;
  width: number;
  height: number;
}

export interface NewtContentsResponse<T> {
  skip: number;
  limit: number;
  total: number;
  items: T[];
}
