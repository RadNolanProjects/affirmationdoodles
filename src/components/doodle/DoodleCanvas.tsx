import { useCallback, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DOODLE } from '@/lib/constants';
import type { DoodlePoint, DoodleStroke } from '@/types';

function pointsToSmoothPath(points: DoodlePoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    // Single point — draw a tiny circle
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
  // End at the final point
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

type Props = {
  onStrokesChange?: (strokes: DoodleStroke[], hasStrokes: boolean) => void;
};

export function DoodleCanvas({ onStrokesChange }: Props) {
  const [strokes, setStrokes] = useState<DoodleStroke[]>([]);
  const currentStrokeRef = useRef<DoodlePoint[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentStrokeRef.current = [{ x: locationX, y: locationY }];
        setCurrentPath(pointsToSmoothPath(currentStrokeRef.current));
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentStrokeRef.current.push({ x: locationX, y: locationY });
        // Update path every 2 points for performance
        if (currentStrokeRef.current.length % 2 === 0) {
          setCurrentPath(pointsToSmoothPath(currentStrokeRef.current));
        }
      },
      onPanResponderRelease: () => {
        const stroke = [...currentStrokeRef.current];
        if (stroke.length > 0) {
          setStrokes((prev) => {
            const next = [...prev, stroke];
            onStrokesChange?.(next, true);
            return next;
          });
        }
        currentStrokeRef.current = [];
        setCurrentPath('');
      },
    })
  ).current;

  const undo = useCallback(() => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      onStrokesChange?.(next, next.length > 0);
      return next;
    });
  }, [onStrokesChange]);

  const getCanvasData = useCallback(() => {
    return {
      strokes,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
    };
  }, [strokes, canvasSize]);

  return {
    canvasView: (
      <View
        style={styles.canvas}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCanvasSize({ width, height });
        }}
        {...panResponder.panHandlers}
      >
        <Svg
          width={canvasSize.width}
          height={canvasSize.height}
          viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
          style={StyleSheet.absoluteFill}
        >
          {strokes.map((stroke, i) => (
            <Path
              key={i}
              d={pointsToSmoothPath(stroke)}
              stroke={DOODLE.strokeColor}
              strokeWidth={DOODLE.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={DOODLE.strokeColor}
              strokeWidth={DOODLE.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
    ),
    undo,
    getCanvasData,
    hasStrokes: strokes.length > 0,
  };
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: DOODLE.canvasBg,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
