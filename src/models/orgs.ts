// シンプル団体

// 団体詳細

// おすすめ団体(スタンプ)
export class RecommendationItem {
  constructor(
    // to be OrganizationFull | OrganizationSimple
    public readonly id: string,
    public coefficient: number = 0,
    public isVisited: boolean = false,
    public isExcluded: boolean = false,
    public stampSlot: number = -1,
  ) {}
}

// おすすめ団体リスト
export class Recommendation {
  constructor(
    public readonly orgs: RecommendationItem[],
    public ignoreRemains: number = 5,
    public renewRemains: number = 5,
  ) {}
}
