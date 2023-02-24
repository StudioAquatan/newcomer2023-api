export interface NewtImage {
  src: string;
  width: number;
  height: number;
}

export interface NewtContentBase {
  _id: string;
  _sys: {
    createdAt: string;
  };
}
export interface NewtContentsResponse<T extends NewtContentBase> {
  skip: number;
  limit: number;
  total: number;
  items: T[];
}
