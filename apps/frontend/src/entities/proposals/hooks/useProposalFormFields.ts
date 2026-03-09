import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { getFormFields } from "../helpers";

export function useProposalFormFields(selectedType: string | null) {
  const { data: teams } = trpc.team.list.useQuery({}, {
    enabled: selectedType === "TEAM"
  });
  
  const { data: projects } = trpc.project.list.useQuery({});

  const formFields = useMemo(() => {
    if (!selectedType) return [];
    
    const baseFields = getFormFields(selectedType);
    
    if (selectedType === "TEAM") {
      const teamField = {
        id: "teamId",
        name: "Team",
        type: "select",
        label: "Select Team",
        placeholder: "Choose a team...",
        required: true,
        options: (teams?.items || []).map((team: any) => ({
          value: team.id,
          label: team.name
        }))
      };
      const projectIdIndex = baseFields.findIndex((field: any) => field.id === "projectId");
      const insertIndex = projectIdIndex >= 0 ? projectIdIndex + 1 : 0;
      baseFields.splice(insertIndex, 0, teamField);
    }
    
    return baseFields;
  }, [selectedType, teams]);

  const projectOptions = useMemo(() => 
    ((projects?.items as any[]) || []).map((p: any) => ({ 
      value: p.id, 
      label: p.name 
    })), 
    [projects]
  );

  return { formFields, projectOptions };
}
