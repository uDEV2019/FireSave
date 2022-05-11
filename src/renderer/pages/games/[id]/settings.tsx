import { useCallback, useEffect, useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  //   faCheckSquare,
  faFile,
  faFolder,
  faFolderOpen,
  faMinusSquare,
  faPlusSquare,
  //   faSquare,
} from "@fortawesome/free-regular-svg-icons";
import {
  faChevronDown,
  faChevronRight,
  faCheckSquare,
  // faFile,
  // faFolder,
  // faFolderOpen,
  // faMinusSquare,
  // faPlusSquare,
  faSquare,
} from "@fortawesome/free-solid-svg-icons";
import CheckboxTree from "react-checkbox-tree";

import Link from "../../../components/Link";
import Layout from "../../../components/Layout";
import Button from "../../../components/Button";
import FormBlock from "../../../components/FormBlock";
import ListInput from "renderer/components/ListInput";
import ToggleInput from "renderer/components/ToggleInput";
import SwitchInput from "renderer/components/SwitchInput";
import LoadingBlock from "renderer/components/LoadingBlock";
import FolderOrFilesInput from "../../../components/FolderOrFilesInput";
import IncludeExcludeActions from "renderer/components/IncludeExcludeActions";

import Toaster from "../../../utils/toaster";
import { globToNodes, TNode } from "renderer/utils/globTree";
import { useGamesStore, useSettingsStore } from "../../../utils/stores";

const folderColor = "#ffd970";

type TGameForm = {
  // exePath: string;
  savesConfig: TSavesConfig & {
    saveFolder: TFolderOrFilesRaw;
  };
};

// TODO: globby size
// TODO: prefill from pcGamingWiki
// TODO: simple/custom config
const GameSettingsPage = () => {
  const games = useGamesStore((state) => state.games);
  const PLATFORM = useSettingsStore((state) => state.envs.PLATFORM);
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();

  const [folderContentTree, setFolderContentTree] = useState<TNode[]>([]);
  const [folderCheckedNodes, setFolderCheckedNodes] = useState<string[]>([]);
  const [folderExpandedNodes, setFolderExpandedNodes] = useState<string[]>([]);
  const [isLoadingFolderContent, setIsLoadingFolderContent] = useState(false);

  const [resultContentTree, setResultContentTree] = useState<TNode[]>([]);
  const [isLoadingResultContent, setIsLoadingResultContent] = useState(false);

  const isEditing = id !== "new";
  const game = id ? games[id] : undefined;

  const icons = useMemo(
    () => ({
      check: <FontAwesomeIcon icon={faCheckSquare} color={theme.purple} />,
      uncheck: <FontAwesomeIcon icon={faSquare} />,
      halfCheck: <FontAwesomeIcon icon={faCheckSquare} />,
      expandClose: <FontAwesomeIcon icon={faChevronRight} />,
      expandOpen: <FontAwesomeIcon icon={faChevronDown} />,
      expandAll: <FontAwesomeIcon icon={faPlusSquare} />,
      collapseAll: <FontAwesomeIcon icon={faMinusSquare} />,
      parentClose: <FontAwesomeIcon icon={faFolder} color={folderColor} />,
      parentOpen: <FontAwesomeIcon icon={faFolderOpen} color={folderColor} />,
      leaf: <FontAwesomeIcon icon={faFile} color={theme.white} />,
    }),
    []
  );

  const { control, watch, handleSubmit, register, setValue } =
    useForm<TGameForm>({
      defaultValues: {
        savesConfig: {
          type: "simple",
          saveFolder: {
            path: "",
          },
          saveFullFolder: true,
          includeList: [],
          excludeList: [],
          ...game?.savesConfig?.[PLATFORM],
        },
      },
    });

  const typeWatch = watch("savesConfig.type");
  const saveFolderWatch = watch("savesConfig.saveFolder");
  const saveFullFolderWatch = watch("savesConfig.saveFullFolder", true);
  const includeListWatch = watch("savesConfig.includeList", []);
  const excludeListWatch = watch("savesConfig.excludeList", []);

  const updateFormValues = useCallback(async () => {
    const path = saveFolderWatch?.path;
    if (!path) return;

    const newFolderContentTree = await getContentTree(
      path,
      ["**/*"],
      [],
      setIsLoadingFolderContent
    );
    if (newFolderContentTree) {
      setFolderContentTree(newFolderContentTree);
    }

    const newResultContentTree = await getContentTree(
      path,
      [...(saveFullFolderWatch ? ["**/*"] : []), ...includeListWatch],
      excludeListWatch,
      setIsLoadingResultContent
    );
    if (newResultContentTree) {
      setResultContentTree(newResultContentTree);
    }
  }, [
    saveFolderWatch,
    saveFullFolderWatch,
    includeListWatch,
    excludeListWatch,
    setFolderContentTree,
    setIsLoadingFolderContent,
    setResultContentTree,
    setIsLoadingResultContent,
  ]);

  const onClickInclude = useCallback(
    (keys: string[]) => () => {
      const newList = [...new Set([...keys, ...includeListWatch])];
      setValue("savesConfig.includeList", newList);
      // TODO: probably can unselect only values that were touched
      setFolderCheckedNodes([]);
    },
    [includeListWatch, setValue, setFolderCheckedNodes]
  );
  const onClickExclude = useCallback(
    (keys: string[]) => () => {
      // console.log({ folderCheckedNodes });
      const newList = [...new Set([...keys, ...excludeListWatch])];
      setValue("savesConfig.excludeList", newList);
      setFolderCheckedNodes([]);
    },
    [excludeListWatch, setValue, setFolderCheckedNodes]
  );

  const onClickRemoveInclude = useCallback(
    (keys: string[]) => () => {
      const newList = [
        ...new Set([...includeListWatch.filter((k) => !keys.includes(k))]),
      ];
      setValue("savesConfig.includeList", newList);
    },
    [includeListWatch, setValue]
  );
  const onClickRemoveExclude = useCallback(
    (keys: string[]) => () => {
      const newList = [
        ...new Set([...excludeListWatch.filter((k) => !keys.includes(k))]),
      ];
      setValue("savesConfig.excludeList", newList);
    },
    [excludeListWatch, setValue]
  );

  useEffect(() => {
    updateFormValues();
  }, [
    saveFolderWatch,
    saveFullFolderWatch,
    includeListWatch,
    excludeListWatch,
  ]);

  const onSubmit = async (data: TGameForm) => {
    console.log("NEW DATA", data);
    if (!game) return;
    try {
      const newSavesConfig: TSavesConfig = data.savesConfig;
      if (newSavesConfig.type === "simple") {
        newSavesConfig.includeList = [];
        newSavesConfig.excludeList = [];
        newSavesConfig.saveFullFolder = true;
      }
      if (newSavesConfig.saveFullFolder) {
        newSavesConfig.includeList = [];
      }

      window.electron.editGame(game.id, {
        isValid: true,
        savesConfig: { [PLATFORM]: data.savesConfig },
      });
    } catch (err) {
      Toaster.add({
        intent: "error",
        content: "Something went wrong" + JSON.stringify(err),
      });
    }
  };

  if (!game) return null;

  // console.log({
  //   saveFolderWatch,
  //   // saveFullFolderWatch,
  //   // includeListWatch,
  //   // excludeListWatch,
  //   // savesConfigSaveFolder,
  //   // checked: folderCheckedNodes,
  //   // expanded: folderExpandedNodes,
  // });

  return (
    <Layout>
      <Header>{isEditing ? game?.name : "Add game"}</Header>

      <h3>You need to setup saves config first</h3>

      <FormBlock onSubmit={handleSubmit(onSubmit)}>
        <SwitchInput<TGameForm>
          control={control}
          name="savesConfig.type"
          values={[{ value: "simple" }, { value: "advanced" }]}
          label="Save config type"
          description="'Simple' easy to setup only folder required but heavier in size, 'Advanced' - select folder and exclude unnecessary files"
        />

        <FolderOrFilesInput<TGameForm>
          control={control}
          name="savesConfig.saveFolder"
          label="Saves folder"
          description={
            <Description>
              Path to saves folder
              {/* <div>
                Path to game save file. Don't know where save file located?
              </div>
              <div style={{ display: "flex" }}>
                You can find game on&nbsp;
                <PcGamingWikiLink to="https://pcgamingwiki.com">
                  PCGamingWiki.com
                </PcGamingWikiLink>
                ,&nbsp;under "Save game data location" will be path to save file
              </div> */}
            </Description>
          }
          // Note: On Windows and Linux an open dialog can not be both a file selector and a directory selector,
          // so if you set properties to ['openFile', 'openDirectory'] on these platforms, a directory selector will be shown.
          // properties={["openDirectory"]}
          properties={["openDirectory"]}
          // isDisabled={!exePath}
          // onClick={onChooseSavesPath}
        />

        {typeWatch === "advanced" && (
          <>
            <ToggleInput
              label="Save full folder"
              description="Save full folder"
              {...register("savesConfig.saveFullFolder")}
            />

            {!saveFolderWatch && <div>Choose saves folder first</div>}
            {saveFolderWatch && (
              <TreesContainer>
                <CheckboxTreeStyled>
                  <div>Files</div>
                  <br />

                  <LoadingBlock isLoading={isLoadingFolderContent}>
                    <CheckboxTree
                      nodes={folderContentTree}
                      icons={icons}
                      checked={folderCheckedNodes}
                      expanded={folderExpandedNodes}
                      checkModel="all"
                      // noCascade={false}
                      expandOnClick={true}
                      noCascade={true}
                      showExpandAll={true}
                      onClick={() => {}}
                      onCheck={setFolderCheckedNodes}
                      onExpand={setFolderExpandedNodes}
                    />
                  </LoadingBlock>
                </CheckboxTreeStyled>

                <CheckboxTreeStyled>
                  <div>Result - files that will be saved</div>
                  <br />

                  <LoadingBlock isLoading={isLoadingResultContent}>
                    <CheckboxTree
                      nodes={resultContentTree}
                      icons={icons}
                      checked={folderCheckedNodes}
                      expanded={folderExpandedNodes}
                      checkModel="all"
                      disabled={true}
                      expandOnClick={true}
                      noCascade={true}
                    />
                  </LoadingBlock>
                </CheckboxTreeStyled>
              </TreesContainer>
            )}

            <IncludeExcludeActions
              checkedNodes={folderCheckedNodes}
              saveFullFolder={saveFullFolderWatch}
              onClickInclude={onClickInclude}
              onClickExclude={onClickExclude}
            />

            <Lists>
              <ListInput
                type="include"
                saveFullFolder={saveFullFolderWatch}
                list={includeListWatch}
                inputProps={register("savesConfig.includeList")}
                onClickRemove={onClickRemoveInclude}
              />

              <ListInput
                type="exclude"
                saveFullFolder={saveFullFolderWatch}
                list={excludeListWatch}
                inputProps={register("savesConfig.excludeList")}
                onClickRemove={onClickRemoveExclude}
              />
            </Lists>
          </>
        )}

        <CtaButtons>
          <Button type="submit">Save</Button>
        </CtaButtons>
      </FormBlock>
    </Layout>
  );
};

const getContentTree = async (
  path: string,
  includeList: string[] = [],
  excludeList: string[] = [],
  setLoading: (loading: boolean) => void
): Promise<TNode[] | undefined> => {
  try {
    setLoading(true);
    let globbyRes = await window.electron.getGlobby({
      path,
      includeList,
      excludeList,
    });
    console.log({ globbyRes });
    const newTree = globToNodes(globbyRes);
    console.log({ newTree });
    return newTree;
  } catch (err) {
    console.error(err);
    // @ts-ignore
    Toaster.add({ intent: "error", message: err });
    return;
  } finally {
    setLoading(false);
  }
};

export default GameSettingsPage;

const Header = styled.h1`
  margin-bottom: 20px;
`;

const Description = styled.div``;

const PcGamingWikiLink = styled(Link)`
  text-decoration: underline;
`;

const CtaButtons = styled.div`
  display: flex;

  > {
    &:not(:first-child) {
      margin-left: 10px;
    }
  }
`;

const TreesContainer = styled.div`
  display: flex;
  margin: -10px;
`;

const CheckboxTreeStyled = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.25);
  margin: 10px;
  padding: 25px;
  border-radius: 10px;
`;

const Lists = styled.div`
  display: flex;
  margin: -10px;
`;
