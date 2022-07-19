import path from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSettingsStore } from "renderer/utils/stores";
import styled from "styled-components";

type TMarkdownProps = {
  children: string;
};

const Markdown = (props: TMarkdownProps) => {
  const { children } = props;
  const RESOURCES_PATH = useSettingsStore((state) => state.envs.RESOURCES_PATH);

  const newChildren = children.replaceAll(
    "./images/",
    path.normalize(
      path.join(RESOURCES_PATH.replace("/%5C", ""), "docs/images/")
    )
  );

  return <Container remarkPlugins={[remarkGfm]}>{newChildren}</Container>;
};

export default Markdown;

const Container = styled(ReactMarkdown)`
  white-space: initial;
`;
