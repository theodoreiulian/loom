import PromptNode from './PromptNode';
import PromptEngineerNode from './PromptEngineerNode';
import ImageGenNode from './ImageGenNode';
import VideoGenNode from './VideoGenNode';

export const nodeTypes = {
  prompt: PromptNode,
  promptEngineer: PromptEngineerNode,
  imageGen: ImageGenNode,
  videoGen: VideoGenNode,
};

export { PromptNode, PromptEngineerNode, ImageGenNode, VideoGenNode };
