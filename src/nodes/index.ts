import PromptNode from './PromptNode';
import ImageInputNode from './ImageInputNode';
import PromptEngineerNode from './PromptEngineerNode';
import ImageGenNode from './ImageGenNode';
import VideoGenNode from './VideoGenNode';

export const nodeTypes = {
  prompt: PromptNode,
  imageInput: ImageInputNode,
  promptEngineer: PromptEngineerNode,
  imageGen: ImageGenNode,
  videoGen: VideoGenNode,
};

export { PromptNode, ImageInputNode, PromptEngineerNode, ImageGenNode, VideoGenNode };
