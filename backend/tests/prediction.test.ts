import { predictProvinceWeek } from "../src/services/prediction.service";

describe("Prediction Service", () => {
  describe("predictProvinceWeek", () => {
    it("should return prediction for a valid province and week", async () => {
      const result = await predictProvinceWeek("Guayas", 10);
      
      expect(result).toBeDefined();
      expect(result.province).toBe("GUAYAS");
      expect(result.epiWeek).toBe(10);
      expect(result.riskLevel).toBeDefined();
      expect(["bajo", "medio", "alto"]).toContain(result.riskLevel);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
      expect(result.expectedCases).toBeGreaterThanOrEqual(0);
      expect(result.topFactors).toBeInstanceOf(Array);
    });

    it("should return low risk for non-existent province", async () => {
      const result = await predictProvinceWeek("NonExistent", 10);
      
      expect(result).toBeDefined();
      expect(result.riskLevel).toBe("bajo");
      expect(result.riskScore).toBe(0);
      expect(result.expectedCases).toBe(0);
      expect(result.record).toBeNull();
    });

    it("should return different predictions for different weeks", async () => {
      const week10 = await predictProvinceWeek("Guayas", 10);
      const week20 = await predictProvinceWeek("Guayas", 20);
      
      // Both should have valid predictions
      expect(week10.riskScore).toBeDefined();
      expect(week20.riskScore).toBeDefined();
    });

    it("should include relevant factors in prediction", async () => {
      const result = await predictProvinceWeek("Guayas", 10);
      
      expect(result.topFactors.length).toBeGreaterThan(0);
      expect(result.topFactors.length).toBeLessThanOrEqual(4);
      
      // All factors should be strings
      result.topFactors.forEach(factor => {
        expect(typeof factor).toBe("string");
        expect(factor.length).toBeGreaterThan(0);
      });
    });

    it("should handle coastal provinces (high risk areas)", async () => {
      const coastalProvinces = ["Guayas", "Manabi", "Los Rios"];
      
      for (const province of coastalProvinces) {
        const result = await predictProvinceWeek(province, 15);
        expect(result.province).toBe(province.toUpperCase());
        expect(result.record).not.toBeNull();
      }
    });

    it("should handle sierra provinces (lower risk areas)", async () => {
      const sierraProvinces = ["Pichincha", "Azuay", "Imbabura"];
      
      for (const province of sierraProvinces) {
        const result = await predictProvinceWeek(province, 15);
        expect(result.province).toBe(province.toUpperCase());
        expect(result.record).not.toBeNull();
      }
    });

    it("should handle amazon provinces (high risk areas)", async () => {
      const amazonProvinces = ["Orellana", "Sucumbios", "Napo"];
      
      for (const province of amazonProvinces) {
        const result = await predictProvinceWeek(province, 15);
        expect(result.province).toBe(province.toUpperCase());
        expect(result.record).not.toBeNull();
      }
    });
  });
});
