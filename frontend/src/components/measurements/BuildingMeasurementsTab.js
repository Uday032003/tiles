import { useQuery } from '@tanstack/react-query';
import { measurementService } from '../../services/measurementService.js';
import SinglePageMeasurementSheet from './SinglePageMeasurementSheet.js';

export default function BuildingMeasurementsTab({ buildingId, building }) {
  const workTypesQuery = useQuery({
    queryKey: ['work-types'],
    queryFn: () => measurementService.listWorkTypes(),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <SinglePageMeasurementSheet
      buildingId={buildingId}
      building={building}
      workTypes={workTypesQuery.data || []}
    />
  );
}
