export interface Image {
  src: string;
  width: number;
  height: number;
}

export class Organization {
  constructor(
    public readonly id: string,
    public readonly fullName: string,
    public readonly shortName: string | null,
    public readonly shortDescription: string,
    public readonly description: string,
    public readonly logo: Image | null,
    public readonly logoFocus: boolean,
    public readonly stampBackground: Image | null,
    public readonly stampColor: string | null,
    public readonly altLogo: string | null,
    public readonly location: string | null,
    public readonly fees: string | null,
    public readonly activeDays: string | null,
    public readonly links: string[],
    public readonly recommendSource: string,
  ) {}
}
