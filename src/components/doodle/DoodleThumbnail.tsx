import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DOODLE } from '@/lib/constants';
import type { DoodleData, DoodlePoint } from '@/types';

function pointsToSmoothPath(points: DoodlePoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.5} ${p.y + 0.5}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

type Props = {
  doodleData: DoodleData;
  width: number;
  height: number;
  inverted?: boolean;
  borderRadius?: number;
};

export function DoodleThumbnail({
  doodleData,
  width,
  height,
  inverted = true,
  borderRadius = 4,
}: Props) {
  const { strokes, canvasWidth, canvasHeight } = doodleData;
  if (!canvasWidth || !canvasHeight || strokes.length === 0) return null;

  const scaleX = width / canvasWidth;
  const scaleY = height / canvasHeight;

  const strokeColor = inverted ? DOODLE.thumbnailStroke : DOODLE.strokeColor;
  const bg = inverted ? DOODLE.thumbnailBg : DOODLE.canvasBg;
  // Scale stroke width proportionally, with a minimum
  const scaledStrokeWidth = Math.max(1, DOODLE.strokeWidth * Math.min(scaleX, scaleY));

  return (
    <View style={[styles.container, { width, height, borderRadius, backgroundColor: bg }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
        {strokes.map((stroke, i) => (
          <Path
            key={i}
            d={pointsToSmoothPath(stroke)}
            stroke={strokeColor}
            strokeWidth={DOODLE.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
