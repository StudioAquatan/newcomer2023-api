export interface Image {
  src: string;
  width: number;
  height: number;
}

export class Organization {
  constructor(
    public readonly fullName: string,
    public readonly shortName: string,
    public readonly shortDescription: string,
    public readonly description: string,
    public readonly logo: Image,
    public readonly stampBackground: Image,
    public readonly stampColor: string,
    public readonly altLogo: string,
    public readonly location: string,
    public readonly fees: string,
    public readonly activeDays: string,
    public readonly links: string[],
  ) {}
}
